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

      // Using upgraded semantic chunking (Phase 1B)
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

    console.log(`[RAG] Embedding ${allChunks.length} chunks...`);
    const chunkTexts = allChunks.map(c => c.content);
    const embeddings = await generateEmbedding(chunkTexts);

    await prisma.$transaction(async (tx) => {
      await tx.embedding.deleteMany();
      const insertPromises = allChunks.map((chunk, i) => {
        const vectorValue = `[${embeddings[i].join(',')}]`;
        const metadataJson = JSON.stringify(chunk.metadata);

        return tx.$executeRaw`
          INSERT INTO embeddings (id, resource_id, content, embedding_vector, metadata)
          VALUES (uuid_generate_v4(), ${chunk.resourceId}::uuid, ${chunk.content}, ${vectorValue}::vector, ${metadataJson}::jsonb)
        `;
      });
      await Promise.all(insertPromises);
    });

    return allChunks.length;
  } catch (error) {
    console.error('Vector Sync Error:', error);
    throw error;
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
export const findRelevantResources = async (userQuery, limit = ragConfig.topK, threshold = ragConfig.similarityThreshold) => {
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
  const dense = await findRelevantResources(query, 10, 0.45);
  const sparse = await searchByKeywords(query, 10);
  let results = reciprocalRankFusion(dense, sparse);
  
  if (results.length >= 2) {
    console.log(`[RAG] Retrieval: hybrid → ${results.length} results`);
    return { results, method: 'hybrid' };
  }

  // Level 2: Relaxed vector search
  results = await findRelevantResources(query, 8, 0.65);
  if (results.length >= 1) {
    console.log(`[RAG] Retrieval: relaxed_vector → ${results.length} results`);
    return { results, method: 'relaxed_vector' };
  }

  console.log(`[RAG] Retrieval: failed/empty`);
  return { results: [], method: 'none' };
};

/**
 * Cross-Encoder Reranker (Phase 1C)
 */
export async function rerankChunks(query, chunks) {
  if (chunks.length <= 2) return chunks; // skip if few results

  console.log(`[RAG] Reranking ${chunks.length} candidates...`);
  
  // Score each chunk against the query using LLM
  const scores = await Promise.all(chunks.map(async (chunk, i) => {
    const score = await scoreRelevance(query, chunk.content || chunk.description);
    return { chunk, score, originalRank: i };
  }));

  return scores
    .sort((a, b) => b.score - a.score)
    .map(x => x.chunk);
}

/**
 * LLM Relevance Scoring (Phase 1C)
 */
async function scoreRelevance(query, passage) {
  try {
    const systemPrompt = {
      role: 'system',
      content: 'You are a high-precision relevance scorer. Reply ONLY with a number between 0 and 10.'
    };
    
    // We use a small, fast model for scoring
    const res = await getAIResponse([{ role: 'user', content: `Rate relevance 0-10 of this passage to the query. Reply with ONLY a number.\nQuery: "${query}"\nPassage: "${passage}"` }], systemPrompt);
    
    return parseFloat(res.trim()) || 0;
  } catch (err) {
    console.error('Reranking Score Error:', err);
    return 0;
  }
}
