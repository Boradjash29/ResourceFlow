import { performance } from 'perf_hooks';
import { RAGLogger } from './ragLogger.js';
import prisma from '../config/prisma.js';
import { getAIResponse } from '../lib/ai.js';
import { findRelevantResources, retrieveWithCascade, rerankChunks } from './embeddings.js';
import { generateEmbedding } from '../lib/ai.js';
import { ragConfig } from './config.js';
import { preprocessQuery } from './utils.js';
import { getSystemPrompt, buildResourceContext, fitContextToBudget } from './prompts.js';
import { ActionHandler } from '../services/actionHandler.js';

const responseCache = new Map(); // Semantic Cache (Phase 5)
const CACHE_THRESHOLD = 0.95; 

/**
 * The RAGEngine orchestrates the entire intelligence flow.
 */
export class RAGEngine {
  constructor(req, messages, memory) {
    this.req = req;
    this.user = req.user;
    this.memory = memory; // Phase 2C
    this.messages = messages;
    
    // Phase 2C: Resolve pronouns ("it", "that room") before retrieval
    const rawText = messages[messages.length - 1].content.trim();
    this.userText = this.memory.resolvePronouns(rawText);
  }

  async process() {
    const startTime = performance.now();
    let retrievalTime = 0;
    
    // Phase 5A: Semantic Cache Lookup
    const userEmbedding = await generateEmbedding(this.userText);
    for (const [cachedQuery, entry] of responseCache.entries()) {
      if (entry.embedding) {
        const similarity = this.cosineSimilarity(userEmbedding, entry.embedding);
        if (similarity > CACHE_THRESHOLD) {
          RAGLogger.logQuery(this.user.id, this.userText, 'semantic_cache');
          return entry.result;
        }
      }
    }

    try {
      const intents = this.analyzeIntent(this.userText);
      const pending = this.memory.getPendingAction();
      const isConfirmed = this.userText.toUpperCase() === 'YES';
      
      // 2. Retrieval Strategy
      const retStart = performance.now();
      let retrievalQuery = this.userText;
      let relevantResources = [];

      if (intents.hasResourceIntent || pending) {
        const query = pending ? (pending.data.resource_name || retrievalQuery) : retrievalQuery;
        const retrieval = await retrieveWithCascade(query, true);
        relevantResources = retrieval.results;

        if (relevantResources.length > 4) {
          relevantResources = await rerankChunks(query, relevantResources);
        }
      }
      retrievalTime = performance.now() - retStart;

      // 3. User Schedule
      const userBookings = await prisma.booking.findMany({
        where: { user_id: this.user.id, status: 'confirmed', end_time: { gt: new Date() } },
        include: { resource: true },
        take: 3,
        orderBy: { start_time: 'asc' }
      });

      // 4. Token Budgeting
      const { fittedResources, fittedHistory } = fitContextToBudget(
        relevantResources,
        userBookings,
        this.messages
      );

      // 5. Build Structured Context
      const { resourceBlock, scheduleBlock } = buildResourceContext(fittedResources, userBookings);
      
      let contextSummary = this.memory.getContextSummary();
      if (pending && isConfirmed) {
        contextSummary += `\n[SYSTEM_NOTE: User has confirmed the pending ${pending.type}. Output the exact same tag again to execute it.]`;
        RAGLogger.logSecurity(this.user.id, `Action confirmed: ${pending.type}`);
      }

      // 6. Generate Response
      const aiStart = performance.now();
      const systemPrompt = getSystemPrompt(
        this.user.name, 
        this.user.role, 
        resourceBlock, 
        scheduleBlock, 
        contextSummary
      );
      
      let aiResponse = await getAIResponse(fittedHistory, systemPrompt);
      aiResponse = aiResponse.replace(/```[\w]*\n?[\s\S]*?```/g, '').trim();
      const aiTime = performance.now() - aiStart;

      // 7. Post-Processing & Actions
      this.req.memory = this.memory; 
      const handler = new ActionHandler(this.req, aiResponse, fittedResources, fittedHistory);
      const finalMessage = await handler.processActions();

      // 8. Update Memory
      this.memory.addMessage('user', this.userText);
      this.memory.addMessage('assistant', finalMessage);

      const result = {
        message: finalMessage,
        resources: fittedResources.map(r => ({ id: r.id, name: r.name }))
      };

      // 9. Structured Monitoring (Phase 7B)
      const totalTime = performance.now() - startTime;
      RAGLogger.logPerformance(this.user.id, {
        totalTime: totalTime.toFixed(2),
        retrievalTime: retrievalTime.toFixed(2),
        aiTime: aiTime.toFixed(2),
        tokens: 'N/A' // Token counting requires API level updates or local estimation
      });

      responseCache.set(this.userText, { result, embedding: userEmbedding });
      return result;

    } catch (error) {
      console.error('[RAG Engine] Error:', error);
      throw error;
    }
  }

  analyzeIntent(text) {
    return {
      hasResourceIntent: /\b(room|space|hall|van|vehicle|laptop|projector|equipment|book|reserv|schedul|avail|meet|capac|location|huddle|update|change|modify|extend|reschedule)\b/i.test(text),
      isDestructive: /\b(cancel|delete|remove|stop|drop)\b/i.test(text),
      isSearch: /\b(find|look|search|show|list|what|where)\b/i.test(text),
      isBooking: /\b(book|reserve|make|create|new)\b/i.test(text)
    };
  }

  cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
