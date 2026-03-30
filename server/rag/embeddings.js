import prisma from '../config/prisma.js';
import { generateEmbedding } from '../lib/ai.js';
import { ragConfig } from './config.js';
import { chunkText, preprocessQuery } from './utils.js';
import { getAIResponse } from '../lib/ai.js';

/**
 * Sentence-aware chunking (Phase 1B)
 */
export function semanticChunk(text, maxTokens = 400, overlap = 0.15) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];
  let current = [];
  let currentLen = 0;
  const overlapSize = Math.floor(maxTokens * overlap);

  for (const sentence of sentences) {
    const sentLen = Math.ceil(sentence.length / 4); // ~tokens
    if (currentLen + sentLen > maxTokens && current.length > 0) {
      chunks.push(current.join(' ').trim());
      const overlapWords = current.join(' ')
        .split(' ').slice(-overlapSize);
      current = overlapWords;
      currentLen = overlapWords.join(' ').length / 4;
    }
    current.push(sentence.trim());
    currentLen += sentLen;
  }
  if (current.length > 0) chunks.push(current.join(' ').trim());
  return chunks;
}

/**
 * Syncs all resources from the database to the embeddings table for RAG.
 */
export const syncAllResources = async () => {
  try {
    const resources = await prisma.resource.findMany();
    const allChunks = [];
    
    resources.forEach(res => {
      const fullText = `
        Resource: ${res.name}
        Type: ${res.type.replace('_', ' ')}
        Location: ${res.location}
        Capacity: ${res.capacity} persons
        Status: ${res.status}
        Description: ${res.description || `A ${res.type.replace('_', ' ')} at ${res.location}.`}
      `.trim();

      const chunks = semanticChunk(fullText, ragConfig.chunkSize / 4, ragConfig.chunkOverlap);
      chunks.forEach((segment, index) => {
        allChunks.push({
          resourceId: res.id,
          content: segment,
          metadata: {
            name: res.name,
            type: res.type,
            chunk_index: index,
            total_chunks: chunks.length,
            synced_at: new Date().toISOString()
          }
        });
      });
    });

    if (allChunks.length === 0) return 0;

    console.log(`[RAG] Generating embeddings for ${allChunks.length} chunks...`);
    const chunkTexts = allChunks.map(c => c.content);
    const embeddings = await generateEmbedding(chunkTexts);

    // Optimized Batched Transaction
    await prisma.$transaction(async (tx) => {
      // Step 1: Clear old entries (Essential when changing dimensions)
      console.log(`[RAG] Clearing existing embeddings to accommodate new 1536-dim vectors...`);
      await tx.embedding.deleteMany();

      // Step 2: Batched Insertion (Reduce round-trips)
      const batchSize = 50;
      for (let i = 0; i < allChunks.length; i += batchSize) {
        const batch = allChunks.slice(i, i + batchSize);
        const batchEmbeddings = embeddings.slice(i, i + batchSize);
        
        // FIX: Bug 1 - Replaced $executeRawUnsafe with parameterized $executeRaw
        await Promise.all(batch.map((chunk, j) => {
          const vectorValue = `[${batchEmbeddings[j].join(',')}]`;
          return tx.$executeRaw`
            INSERT INTO embeddings (id, resource_id, content, embedding_vector, metadata)
            VALUES (uuid_generate_v4(), ${chunk.resourceId}::uuid, ${chunk.content}, ${vectorValue}::vector, ${chunk.metadata}::jsonb)
          `;
        }));
      }
    }, {
      timeout: 30000 // 30s timeout for large syncs
    });

    console.log(`[RAG] Successfully synced ${allChunks.length} chunks.`);
    return allChunks.length;
  } catch (error) {
    console.error('[RAG] Vector Sync Critical Error:', error);
    throw error;
  }
};

/**
 * Syncs a single resource by its ID.
 * Called automatically when a resource is created or updated.
 */
export const syncSingleResource = async (resourceId) => {
  try {
    const res = await prisma.resource.findUnique({
      where: { id: resourceId }
    });

    if (!res) {
      // If resource is gone, clear its embeddings
      await prisma.embedding.deleteMany({
        where: { resource_id: resourceId }
      });
      return 0;
    }

    const fullText = `
      Resource: ${res.name}
      Type: ${res.type.replace('_', ' ')}
      Location: ${res.location}
      Capacity: ${res.capacity} persons
      Status: ${res.status}
      Description: ${res.description || `A ${res.type.replace('_', ' ')} at ${res.location}.`}
    `.trim();

    const chunks = semanticChunk(fullText, ragConfig.chunkSize / 4, ragConfig.chunkOverlap);
    const chunkTexts = chunks.map(c => c);
    const embeddings = await generateEmbedding(chunkTexts);

    await prisma.$transaction(async (tx) => {
      // Clear old
      await tx.embedding.deleteMany({
        where: { resource_id: resourceId }
      });

      // Insert new
      await Promise.all(chunks.map((segment, index) => {
        const vectorValue = `[${embeddings[index].join(',')}]`;
        const metadata = {
          name: res.name,
          type: res.type,
          chunk_index: index,
          total_chunks: chunks.length,
          synced_at: new Date().toISOString()
        };

        return tx.$executeRaw`
          INSERT INTO embeddings (id, resource_id, content, embedding_vector, metadata)
          VALUES (uuid_generate_v4(), ${res.id}::uuid, ${segment}, ${vectorValue}::vector, ${metadata}::jsonb)
        `;
      }));
    });

    console.log(`[RAG] Auto-synced resource "${res.name}" (${chunks.length} chunks).`);
    return chunks.length;
  } catch (error) {
    console.error(`[RAG] Auto-sync Error for ${resourceId}:`, error);
    // Don't throw, just log to prevent breaking the main transaction if called improperly
  }
};

/**
 * Hybrid Search using Reciprocal Rank Fusion (Phase 1A)
 */
function reciprocalRankFusion(denseList, sparseList, k = 60) {
  const scores = new Map();
  const addScore = (list, weight = 1) => {
    list.forEach((item, rank) => {
      const id = item.resource_id || item.id;
      const prev = scores.get(id) || { item, score: 0 };
      prev.score += weight * (1 / (k + rank + 1));
      scores.set(id, prev);
    });
  };
  addScore(denseList, 1.2); 
  addScore(sparseList, 1.0);
  return [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(x => x.item);
}

/**
 * Performs a vector similarity search to find relevant resources for a user query.
 */
export const findRelevantResources = async (userQuery, limit = ragConfig.topK, threshold = ragConfig.cacheThreshold) => {
  try {
    const embedding = await generateEmbedding(userQuery);
    const vectorValue = `[${embedding.join(',')}]`;

    const results = await prisma.$queryRaw`
      SELECT r.*, e.content, (e.embedding_vector <=> ${vectorValue}::vector) as distance
      FROM resources r
      JOIN embeddings e ON r.id = e.resource_id
      WHERE (e.embedding_vector <=> ${vectorValue}::vector) < ${threshold}
      ORDER BY distance ASC
      LIMIT ${limit}
    `;

    return results;
  } catch (error) {
    console.error('Vector Search Error:', error);
    throw error;
  }
};

/**
 * Stage 2 — Sparse retrieval (Phase 1A)
 */
export const searchByKeywords = async (queryText, limit = 10) => {
  try {
    const results = await prisma.$queryRaw`
      SELECT r.*, ts_rank(
        to_tsvector('english', r.name || ' ' || (COALESCE(r.description, ''))),
        plainto_tsquery('english', ${queryText})
      ) AS keyword_score
      FROM resources r
      WHERE to_tsvector('english', r.name || ' ' || (COALESCE(r.description, '')))
      @@ plainto_tsquery('english', ${queryText})
      ORDER BY keyword_score DESC
      LIMIT ${limit}
    `;
    return results;
  } catch (err) {
    console.error('Keyword Search Error:', err);
    return [];
  }
};

/**
 * 4-Level Retrieval Cascade (Phase 1D)
 */
export const retrieveWithCascade = async (query, hasResourceIntent) => {
  // Level 1: Dense + Sparse RRF
  const dense = await findRelevantResources(query, 10, 0.5);
  const sparse = await searchByKeywords(query, 10);
  let results = reciprocalRankFusion(dense, sparse);
  
  if (results.length >= 2) {
    console.log(`[RAG] Retrieval: hybrid → ${results.length} results`);
    return { results, method: 'hybrid' };
  }

  // Level 2: Relaxed vector search
  results = await findRelevantResources(query, 8, 0.7);
  if (results.length >= 1) {
    console.log(`[RAG] Retrieval: relaxed_vector → ${results.length} results`);
    return { results, method: 'relaxed_vector' };
  }

  console.log(`[RAG] Retrieval: failed/empty`);
  return { results: [], method: 'none' };
};

/**
 * Batched Reranker (Phase 1C)
 * Bug 1: Batched all chunks into one LLM call for speed and cost.
 */
export async function rerankChunks(query, chunks) {
  if (chunks.length <= 1) return chunks; 

  console.log(`[RAG] Batched reranking ${chunks.length} candidates...`);
  
  try {
    const systemPrompt = {
      role: 'system',
      content: 'You are a high-precision reranker. Your task is to rank the provided passages by relevance to the query. Reply ONLY with a valid JSON array of indices [0, 1, 2...] in order of most relevant to least relevant.'
    };
    
    const passageList = chunks.map((c, i) => `[ID ${i}]: ${c.content || c.description}`).join('\n\n');
    const userPrompt = `Query: "${query}"\n\nPassages:\n${passageList}\n\nRank the IDs by relevance. Reply with ONLY a JSON array, e.g., [2, 0, 1].`;

    const res = await getAIResponse([{ role: 'user', content: userPrompt }], systemPrompt);
    
    // Attempt to parse the indices
    const indicesStr = res.match(/\[[\d,\s]+\]/);
    if (indicesStr) {
      try {
        // FIX: Bug 4 - Sanitize trailing commas and handle parse errors
        const cleaned = indicesStr[0].replace(/,\s*]/g, ']');
        const indices = JSON.parse(cleaned);
        const reranked = indices
          .filter(idx => idx >= 0 && idx < chunks.length)
          .map(idx => chunks[idx]);
        
        // Add any missing chunks back at the end just in case LLM missed some
        const seenIds = new Set(indices);
        chunks.forEach((c, i) => {
          if (!seenIds.has(i)) reranked.push(c);
        });

        return reranked;
      } catch (err) {
        console.error('[Reranker] Failed to parse LLM response:', err.message, '| Raw:', indicesStr[0]);
        return chunks; // fallback to original order
      }
    }
    
    return chunks; // Fallback to original order if parsing fails
  } catch (err) {
    console.error('Batched Reranking Error:', err);
    return chunks; // Fallback
  }
}
