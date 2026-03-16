import { query } from '../config/db.js';
import { generateEmbedding } from '../lib/ai.js';

/**
 * Syncs all resources from the database to the embeddings table for RAG.
 */
export const syncAllResources = async () => {
  try {
    const resources = await query('SELECT * FROM resources');
    
    for (const res of resources.rows) {
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

      await query(
        `INSERT INTO embeddings (resource_id, embedding_vector, content)
         VALUES ($1, $2, $3)
         ON CONFLICT (resource_id) 
         DO UPDATE SET embedding_vector = $2, content = $3, updated_at = NOW()`,
        [res.id, vectorValue, description]
      );
    }

    return resources.rows.length;
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

    const result = await query(
      `SELECT r.*, e.content, (e.embedding_vector <=> $1) as distance
       FROM resources r
       JOIN embeddings e ON r.id = e.resource_id
       ORDER BY distance ASC
       LIMIT $2`,
      [vectorValue, limit]
    );

    return result.rows;
  } catch (error) {
    console.error('Vector Search Error:', error);
    throw error;
  }
};
