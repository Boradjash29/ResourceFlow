import prisma from '../config/prisma.js';
import { generateEmbedding } from '../lib/ai.js';

/**
 * Syncs all resources from the database to the embeddings table for RAG.
 */
export const syncAllResources = async () => {
  try {
    const resources = await prisma.resource.findMany();
    
    const syncPromises = resources.map(async (res) => {
      const description = `
        Resource: ${res.name}
        Type: ${res.type.replace('_', ' ')}
        Location: ${res.location}
        Capacity: ${res.capacity} persons
        Status: ${res.status}
        Description: A ${res.type.replace('_', ' ')} located at ${res.location}.
      `.trim();

      const embedding = await generateEmbedding(description);
      const vectorValue = `[${embedding.join(',')}]`;

      // Using raw SQL for the vector insert as Prisma doesn't natively support pgvector types in its DSL
      return prisma.$executeRaw`
        INSERT INTO embeddings (resource_id, embedding_vector, content)
        VALUES (${res.id}::uuid, ${vectorValue}::vector, ${description})
        ON CONFLICT (resource_id) 
        DO UPDATE SET embedding_vector = ${vectorValue}::vector, content = ${description}, updated_at = NOW()
      `;
    });

    await Promise.all(syncPromises);
    return resources.length;
  } catch (error) {
    console.error('Vector Sync Error:', error);
    throw error;
  }
};

/**
 * Performs a vector similarity search to find relevant resources for a user query.
 */
export const findRelevantResources = async (userQuery, limit = 3) => {
  try {
    const embedding = await generateEmbedding(userQuery);
    const vectorValue = `[${embedding.join(',')}]`;

    // Cosine distance similarity search using raw SQL
    const results = await prisma.$queryRaw`
      SELECT r.*, e.content, (e.embedding_vector <=> ${vectorValue}::vector) as distance
      FROM resources r
      JOIN embeddings e ON r.id = e.resource_id
      ORDER BY distance ASC
      LIMIT ${limit}
    `;

    return results;
  } catch (error) {
    console.error('Vector Search Error:', error);
    throw error;
  }
};
