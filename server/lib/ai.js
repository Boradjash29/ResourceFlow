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
const MAX_EMBEDDING_CACHE = 1000;

function addToEmbeddingCache(text, embedding) {
  if (embeddingCache.size >= MAX_EMBEDDING_CACHE) {
    const firstKey = embeddingCache.keys().next().value;
    embeddingCache.delete(firstKey);
  }
  embeddingCache.set(text, embedding);
}

/**
 * Generates embeddings via OpenRouter (Gemini Models)
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
        addToEmbeddingCache(missingTexts[i], embedding);
        results[idx] = embedding;
      });
    }

    return isArray ? results : results[0];
  } catch (error) {
    console.error('[OpenRouter] Embedding Generation Failed:', error.message);
    throw error;
  }
};

/**
 * Multi-layer Prompt Injection Shield
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
 * Chat Completions via OpenRouter (Gemini Models)
 */
export const getAIResponse = async (messages, systemPromptObj) => {
  try {
    const lastUserMsg = messages[messages.length - 1]?.content || "";
    if (detectInjection(lastUserMsg)) {
      console.warn(`[SECURITY] Prompt injection detected: "${lastUserMsg}"`);
      return "I'm sorry, but I cannot perform that action as it violates my security guidelines.";
    }

    const systemPrompt = typeof systemPromptObj === 'object' ? systemPromptObj.content : systemPromptObj;

    const response = await client.chat.completions.create({
      model: process.env.AI_MODEL || ragConfig.completionModel,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: ragConfig.temperature,
      max_tokens: ragConfig.maxTokens,
    });

    return response.choices[0].message.content;
  } catch (error) {
    if (error.status === 401 || !process.env.OPENROUTER_API_KEY) {
      console.warn('[AI Mock Mode] Returning simulated response due to OpenRouter Auth Error');
      return "I'm currently running in **Mock Mode** because the OpenRouter API key is invalid or unauthorized. \n\n*Technical Detail: OpenRouter 401*";
    }
    console.error('[OpenRouter] Completion Failed:', error.message);
    throw error;
  }
};
