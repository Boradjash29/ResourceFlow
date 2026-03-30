import { performance } from 'perf_hooks';
import crypto from 'crypto'; // FIX: Bug 2 - Required for hashing cache keys
import { RAGLogger } from './ragLogger.js';
import prisma from '../config/prisma.js';
import { getAIResponse } from '../lib/ai.js';
import { findRelevantResources, retrieveWithCascade, rerankChunks } from './embeddings.js';
import { generateEmbedding } from '../lib/ai.js';
import { ragConfig } from './config.js';
import { preprocessQuery } from './utils.js';
import { getSystemPrompt, buildResourceContext, fitContextToBudget } from './prompts.js';
import { ActionHandler } from '../services/actionHandler.js';

// Bug 2 & 9: Semantic Cache with TTL and Environment tuning
const responseCache = new Map(); 
const inProgressQueries = new Map(); // FIX: Bug 4 - Concurrency Lock Map
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const MAX_CACHE = 1000;
// FIX: Bug 5 - Removed redefined CACHE_THRESHOLD, using ragConfig.cacheThreshold

// Cleanup Interval (runs every 10 mins)
setInterval(() => {
  const now = Date.now();
  for (const [query, entry] of responseCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) responseCache.delete(query);
  }
  if (responseCache.size > MAX_CACHE) {
    const toDelete = Math.floor(MAX_CACHE * 0.2);
    const keys = Array.from(responseCache.keys());
    for (let i = 0; i < toDelete; i++) responseCache.delete(keys[i]);
  }
}, 10 * 60 * 1000);

/**
 * The RAGEngine orchestrates the entire intelligence flow.
 */
export class RAGEngine {
  constructor(req, messages, memory) {
    this.req = req;
    this.user = req.user;
    this.memory = memory; 
    this.messages = messages;
    
    const rawText = messages[messages.length - 1].content.trim();
    this.userText = this.memory.resolvePronouns(rawText);
  }

  async process() {
    const startTime = performance.now();
    let retrievalTime = 0;
    
    // 1. Prepare Identifiers & Early State
    const rawText = this.userText.trim().replace(/[!.?]/g, '');
    const isConfirmation = /^(YES|CONFIRM|YEP|DO IT|SURE|OKAY|OK|PROCEED|AFFIRMATIVE)\b/i.test(rawText);
    const isShortQuery = this.userText.split(' ').length < 3;
    const skipCache = isConfirmation || isShortQuery;
    
    const hash = crypto.createHash('sha256').update(this.userText).digest('hex').slice(0, 16);
    const cacheKey = `${this.user.id}:${hash}`;
    
    this.req.isAIConfirmed = isConfirmation && !!this.memory.getPendingAction();

    // 2. Semantic Cache Lookup
    let cachedResult = null;
    let userEmbedding = null; // Defined here for closure access

    if (!skipCache) {
      userEmbedding = await generateEmbedding(this.userText);
      const now = Date.now();

      for (const [cachedKey, entry] of responseCache.entries()) {
        const [cUserId, cHash] = cachedKey.split(':');
        if (now - entry.timestamp > CACHE_TTL) {
          responseCache.delete(cachedKey);
          continue;
        }
        if (cUserId === this.user.id && entry.embedding) {
          const similarity = this.cosineSimilarity(userEmbedding, entry.embedding);
          if (similarity > (ragConfig.cacheThreshold || 0.7)) {
            RAGLogger.logQuery(this.user.id, this.userText, 'semantic_cache');
            entry.timestamp = now;
            return entry.result;
          }
        }
      }

      // Concurrency Lock
      if (inProgressQueries.has(cacheKey)) {
        RAGLogger.logQuery(this.user.id, this.userText, 'concurrency_wait');
        return inProgressQueries.get(cacheKey);
      }
    }

    // 3. Main Orchestration Flow
    const orchestrationPromise = (async () => {
      try {
        // Ensure userEmbedding exists even if cache was skipped
        if (!userEmbedding) {
          userEmbedding = await generateEmbedding(this.userText);
        }

        const intents = this.analyzeIntent(this.userText);
        const pending = this.memory.getPendingAction();
        const cleanText = this.userText.trim().replace(/[!.?]/g, '');
        const confirmTerms = ['YES', 'CONFIRM', 'YEP', 'DO IT', 'SURE', 'OKAY', 'OK', 'PROCEED', 'AFFIRMATIVE'];
        
        const isConfirmed = confirmTerms.some(term => {
          const regex = new RegExp(`(^|\\s)${term}(\\s|$)`, 'i');
          return regex.test(cleanText) && cleanText.length < 30;
        });
        
        this.req.isAIConfirmed = isConfirmed && !!pending;
        
        // 2. Retrieval Strategy
        const retStart = performance.now();
        let retrievalQuery = this.userText;

        // Enhance short conversational queries with recent chat history for better vector retrieval
        if (this.userText.split(' ').length < 8 && this.memory.messages.length > 0) {
          const recentUserMsgs = this.memory.messages
            .filter(m => m.role === 'user')
            .slice(-2)
            .map(m => m.content)
            .join(' ');
          retrievalQuery = `${recentUserMsgs} ${this.userText}`.trim();
        }

        let relevantResources = [];

        if (intents.hasResourceIntent || pending) {
          // If searching, use the resource name from pending action or the query
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
          take: 5, // Increased from 3 for better context
          orderBy: { start_time: 'asc' }
        });

        // 4. Token Budgeting
        // FIX: Bug 3 - Receive fittedSchedule and use it
        const { fittedResources, fittedSchedule, fittedHistory } = fitContextToBudget(
          relevantResources,
          userBookings,
          this.messages
        );

        // 5. Build Structured Context
        const { resourceBlock, scheduleBlock } = buildResourceContext(fittedResources, fittedSchedule);
        
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
        
        // Sanitization
        aiResponse = aiResponse
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') 
          .replace(/\n{3,}/g, '\n\n') 
          .trim();

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

        // 9. Structured Monitoring
        const totalTime = performance.now() - startTime;
        RAGLogger.logPerformance(this.user.id, {
          totalTime: totalTime.toFixed(2),
          retrievalTime: retrievalTime.toFixed(2),
          aiTime: aiTime.toFixed(2),
          tokens: 'ESTIMATED' 
        });

        // FIX: Bug 2 - Cache the result with the new unique key
        responseCache.set(cacheKey, { 
          result, 
          embedding: userEmbedding, 
          timestamp: Date.now(),
          query: this.userText // store original query for debugging
        });
        return result;

      } catch (error) {
        console.error('[RAG Engine] Error:', error);
        throw error;
      } finally {
        inProgressQueries.delete(cacheKey);
      }
    })();

    inProgressQueries.set(cacheKey, orchestrationPromise);
    return orchestrationPromise;
  }

  analyzeIntent(text) {
    const isGreeting = /^(hi|hello|hey|good morning|afternoon|evening|how are you|thanks|thank you|bye|goodbye)\b/i.test(text.trim());
    
    return {
      // Always retrieve context unless it is a pure greeting
      hasResourceIntent: !isGreeting,
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
