/**
 * Central configuration for the RAG pipeline.
 */
export const ragConfig = {
  // Ingestion
  chunkSize: 512,
  chunkOverlap: 0.15,
  
  // Retrieval
  topK: 5,
  similarityThreshold: 0.7,
  
  // Generation
  temperature: 0.1,
  maxTokens: 800,
  
  // Models
  embeddingModel: "text-embedding-3-small",
  completionModel: "google/gemini-flash-1.5",
  
  // Caching
  cacheTTL: 1000 * 60 * 60,
};
