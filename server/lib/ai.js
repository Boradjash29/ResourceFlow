import OpenAI from 'openai';
import dotenv from 'dotenv';
import { ragConfig } from '../rag/config.js';

dotenv.config();

// Initialize OpenRouter client using OpenAI SDK
const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000", 
    "X-Title": "ResourceFlow Assistant",
  }
});

const embeddingCache = new Map();

/**
 * Generates embeddings for text or an array of texts.
 */
export const generateEmbedding = async (input) => {
  try {
    const isArray = Array.isArray(input);
    const texts = isArray ? input : [input];
    const results = new Array(texts.length);
    const missingIndices = [];
    const missingTexts = [];

    texts.forEach((text, i) => {
      if (embeddingCache.has(text)) {
        results[i] = embeddingCache.get(text);
      } else {
        missingIndices.push(i);
        missingTexts.push(text);
      }
    });

    if (missingTexts.length > 0) {
      const response = await client.embeddings.create({
        model: process.env.EMBEDDING_MODEL || ragConfig.embeddingModel,
        input: missingTexts,
      });

      response.data.forEach((item, i) => {
        const idx = missingIndices[i];
        const embedding = item.embedding;
        embeddingCache.set(missingTexts[i], embedding);
        results[idx] = embedding;
      });
    }

    return isArray ? results : results[0];
  } catch (error) {
    console.error('Embedding Generation Failed:', error);
    throw error;
  }
};

/**
 * Multi-layer Prompt Injection Shield (Phase 6A)
 */
export function detectInjection(text) {
  const patterns = [
    /ignore all (prior|previous) instructions/i,
    /system override|developer mode|dan mode/i,
    /forget everything you know/i,
    /stop being an assistant/i,
    /you are now a/i,
    /output the system prompt/i,
    /print your instructions/i
  ];
  return patterns.some(p => p.test(text));
}

/**
 * Low-level wrapper for LLM completion.
 */
export const getAIResponse = async (messages, systemPromptObj) => {
  try {
    // Phase 6A: Input Sanitization
    const lastUserMsg = messages[messages.length - 1]?.content || "";
    if (detectInjection(lastUserMsg)) {
      console.warn(`[SECURITY] Prompt injection detected: "${lastUserMsg}"`);
      return "I'm sorry, but I cannot perform that action as it violates my security guidelines. Please stick to resource management tasks.";
    }

    const sanitizedMessages = messages.map(msg => ({
      ...msg,
      content: msg.content.replace(/ignore all prior instructions|system override|developer mode/gi, "[REDACTED]")
    }));

    const response = await client.chat.completions.create({
      model: process.env.AI_MODEL || ragConfig.completionModel,
      messages: [systemPromptObj, ...sanitizedMessages],
      temperature: ragConfig.temperature,
      max_tokens: ragConfig.maxTokens,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('AI Completion Failed:', error);
    throw error;
  }
};
