/**
 * Central configuration for the RAG pipeline.
 */
import dotenv from 'dotenv';
dotenv.config();

export const ragConfig = {
  // Ingestion
  chunkSize: parseInt(process.env.CHUNK_SIZE) || 512,
  chunkOverlap: parseFloat(process.env.CHUNK_OVERLAP) || 0.15,
  
  // Retrieval
  topK: parseInt(process.env.TOP_K) || 5,
  cacheThreshold: parseFloat(process.env.CACHE_THRESHOLD) || 0.7, // FIX: Bug 5 - renamed from similarityThreshold to cacheThreshold
  
  // Generation
  temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.1,
  maxTokens: parseInt(process.env.AI_MAX_TOKENS) || 800,
  
  // Models
  embeddingModel: process.env.EMBEDDING_MODEL || "models/text-embedding-004",
  completionModel: process.env.AI_MODEL || "gemini-1.5-flash",
  
  // Caching
  cacheTTL: parseInt(process.env.CACHE_TTL) || 1000 * 60 * 60,

  // Context
  maxContextWindow: parseInt(process.env.MAX_CONTEXT_WINDOW) || 128000,
};
