import prisma from '../config/prisma.js';
import { getAIResponse } from '../lib/ai.js';
import { findRelevantResources } from './embeddings.js';
import { ragConfig } from './config.js';
import { preprocessQuery } from './utils.js';
import { getSystemPrompt } from './prompts.js';
import { ActionHandler } from '../services/actionHandler.js';

// --- Anti-Hallucination Patterns ---
const GREETING_PATTERN = /^(hi+|he+y+|howdy|greetings|good\s*(morning|afternoon|evening|day)|what'?s up|sup+|yo+|thanks|thank you|ok+a*y*|cool|great|bye+|goodbye|sure)[!\.,?\s]*$/i;
const RESOURCE_INTENT_PATTERN = /\b(room\w*|space\w*|hall\w*|van\w*|vehicle\w*|laptop\w*|projector\w*|equipment|board\w*|book\w*|reserv\w*|schedul\w*|avail\w*|meet\w*|confer\w*|capac\w*|location\w*|huddle\w*|update|change|modify|extend|reschedule)/i;
const DATE_TIME_PATTERN = /\b(\d{1,2}\s*(am|pm)|\d{1,2}:\d{2}|january|february|march|april|may|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|next\s*week|\d{1,2}\s*(st|nd|rd|th)?)\b/i;

const responseCache = new Map();

/**
 * The RAGEngine orchestrates the entire intelligence flow for a single user message.
 */
export class RAGEngine {
  constructor(req, messages) {
    this.req = req;
    this.user = req.user;
    this.messages = messages;
    this.userText = messages[messages.length - 1].content.trim();
  }

  async process() {
    const cacheKey = `${this.user.id}:${this.userText.toLowerCase()}`;
    if (responseCache.has(cacheKey)) {
      console.log(`[RAG Engine] Cache Hit`);
      return responseCache.get(cacheKey);
    }

    try {
      // 1. Detect Intent
      const isGreeting = GREETING_PATTERN.test(this.userText);
      const hasResourceIntent = RESOURCE_INTENT_PATTERN.test(this.userText);
      const isDateTimeReply = DATE_TIME_PATTERN.test(this.userText) && !hasResourceIntent;
      const queryTooVague = this.userText.length < 6 && !hasResourceIntent;

      // 2. Retrieval Strategy (Direct or History-based)
      let retrievalQuery = this.userText;
      let inBookingFlow = false;

      if (!isGreeting && !hasResourceIntent && this.messages.length > 2) {
        const history = [...this.messages].slice(0, -1).reverse();
        const lastAssistantMsg = history.find(m => m.role === 'assistant');

        if (lastAssistantMsg && RESOURCE_INTENT_PATTERN.test(lastAssistantMsg.content)) {
          retrievalQuery = `${this.userText} (context: ${lastAssistantMsg.content})`;
          inBookingFlow = true;
        } else {
          const prevUserMsg = history.find(m => m.role === 'user' && RESOURCE_INTENT_PATTERN.test(m.content));
          if (prevUserMsg) {
            retrievalQuery = `${this.userText} (context: ${prevUserMsg.content})`;
            inBookingFlow = true;
          }
        }
      }

      // 3. Find Relevant Resources
      let relevantResources = [];
      if (!isGreeting && !queryTooVague && (hasResourceIntent || inBookingFlow)) {
        relevantResources = await this.performRetrieval(retrievalQuery, hasResourceIntent || inBookingFlow);
      }

      // 4. Build Context
      const context = await this.buildContext(relevantResources);

      // 5. Generate Response
      const hasResourceContext = relevantResources.length > 0;
      const systemPrompt = getSystemPrompt(this.user.name, this.user.role, context);
      
      let aiResponse = await getAIResponse(this.messages, systemPrompt);

      // 6. Post-Processing & Actions
      aiResponse = aiResponse.replace(/```[\w]*\n?[\s\S]*?```/g, '').trim();
      
      const handler = new ActionHandler(this.req, aiResponse, relevantResources, this.messages);
      const finalMessage = await handler.processActions();

      const result = {
        message: finalMessage,
        resources: relevantResources.map(r => ({ id: r.id, name: r.name }))
      };

      responseCache.set(cacheKey, result);
      return result;

    } catch (error) {
      console.error('[RAG Engine] Error:', error);
      throw error;
    }
  }

  async performRetrieval(query, isResourceQuery) {
    const normalizedQuery = preprocessQuery(query);
    const vectorResults = await findRelevantResources(normalizedQuery);
    let results = vectorResults.filter(r => r.distance == null || r.distance < ragConfig.similarityThreshold);

    // DB Fallback if vector results are empty or capacity specified
    const capacityGoal = this.extractCapacityGoal(query);
    if (results.length === 0 || capacityGoal) {
      const typeHint = this.extractTypeHint(query);
      const extra = await prisma.resource.findMany({
        where: {
          status: 'available',
          ...(typeHint ? { type: typeHint } : {}),
          ...(capacityGoal ? { capacity: { gte: capacityGoal } } : {})
        },
        take: 5,
        orderBy: { capacity: 'asc' }
      });

      extra.forEach(er => {
        if (!results.find(rr => rr.id === er.id)) results.push(er);
      });
    }
    return results;
  }

  async buildContext(resources) {
    const [dbUser, userBookings, resourceSchedules, totalBookingsCount] = await Promise.all([
      prisma.user.findUnique({ where: { id: this.user.id }, select: { name: true, role: true, created_at: true } }),
      prisma.booking.findMany({ where: { user_id: this.user.id, status: 'confirmed', end_time: { gt: new Date() } }, orderBy: { start_time: 'asc' }, take: 3 }),
      Promise.all(resources.map(async (r) => {
        const bookings = await prisma.booking.findMany({ where: { resource_id: r.id, status: 'confirmed', end_time: { gt: new Date() } }, orderBy: { start_time: 'asc' }, take: 5 });
        return { id: r.id, bookings };
      })),
      prisma.booking.count({ where: { user_id: this.user.id } })
    ]);

    const userProfile = `USER PROFILE: Name: ${dbUser.name} | Role: ${dbUser.role} | Bookings: ${totalBookingsCount}`;
    const schedule = userBookings.length > 0 
      ? userBookings.map(b => `- [BOOK_ID: ${b.id}] ${b.meeting_title}: ${b.start_time.toLocaleString()}`).join('\n')
      : 'No upcoming bookings.';

    const resourceContext = resources.length > 0
      ? resources.map(r => {
          const s = resourceSchedules.find(rs => rs.id === r.id);
          const busy = s?.bookings?.length > 0 
            ? s.bookings.map(b => `${b.start_time.toLocaleTimeString()} - ${b.end_time.toLocaleTimeString()}`).join(', ')
            : 'Available';
          return `[RES_ID: ${r.id}] ${r.name} (${r.type}) | Cap: ${r.capacity} | Schedule: ${busy}`;
        }).join('\n\n')
      : 'NO_RESOURCE_CONTEXT';

    return `${userProfile}\n\nYOUR SCHEDULE:\n${schedule}\n\nRESOURCE CATALOG:\n${resourceContext}`;
  }

  extractTypeHint(text) {
    if (/\bvan\w*|vehicle\w*|\bcar\b|transport\w*/i.test(text)) return 'vehicle';
    if (/\blaptop\w*|computer\w*|\bpc\b|device\w*/i.test(text))  return 'laptop';
    if (/\bprojector\w*|\bscreen\w*|display\w*/i.test(text))      return 'projector';
    if (/\broom\w*|\bhall\w*|space\w*|board\w*|meet\w*|huddle\w*|confer\w*/i.test(text)) return 'meeting_room';
    return null;
  }

  extractCapacityGoal(text) {
    const match = text.match(/(\d+)\s*(people|person|attendees|participants|seats|members)/i);
    return match ? parseInt(match[1]) : null;
  }
}
