import prisma from '../config/prisma.js';
import { generateEmbedding } from '../lib/ai.js';
import { ragConfig } from './config.js';
import { chunkText } from './utils.js';

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

      const chunks = chunkText(fullText, ragConfig.chunkSize, ragConfig.chunkOverlap);
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
 * Performs a vector similarity search to find relevant resources for a user query.
 */
export const findRelevantResources = async (userQuery, limit = ragConfig.topK) => {
  try {
    const embedding = await generateEmbedding(userQuery);
    const vectorValue = `[${embedding.join(',')}]`;

    const results = await prisma.$queryRaw`
      SELECT r.*, e.content, (e.embedding_vector <=> ${vectorValue}::vector) as distance
      FROM resources r
      JOIN embeddings e ON r.id = e.resource_id
      WHERE (e.embedding_vector <=> ${vectorValue}::vector) < ${ragConfig.similarityThreshold}
      ORDER BY distance ASC
      LIMIT ${limit}
    `;

    return results;
  } catch (error) {
    console.error('Vector Search Error:', error);
    throw error;
  }
};
