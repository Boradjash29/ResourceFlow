import OpenAI from 'openai';
import dotenv from 'dotenv';

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

/**
 * Generates an embedding for a text string.
 */
export const generateEmbedding = async (text) => {
  try {
    const response = await client.embeddings.create({
      model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Embedding Generation Failed:', error);
    throw error;
  }
};

/**
 * Generates an AI response using the selected Gemini model via OpenRouter.
 */
export const getAIResponse = async (messages, context = "") => {
  try {
    const systemPrompt = {
      role: "system",
      content: `You are the ResourceFlow AI Assistant. You help employees find and book office resources.
      Use the provided database context to give accurate information about rooms, equipment, and availability.
      If you can't find specific information, suggest similar resources or ask for clarification.
      
      RETRIEVED CONTEXT:
      ${context}
      
      Keep answers helpful, friendly, and under 3 sentences unless requested otherwise.`
    };

    const response = await client.chat.completions.create({
      model: process.env.AI_MODEL || "google/gemini-flash-1.5",
      messages: [systemPrompt, ...messages],
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('AI Completion Failed:', error);
    throw error;
  }
};
