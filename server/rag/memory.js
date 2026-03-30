// UPGRADED: Phase 2C changes applied
// Changes: New ConversationMemory class for entity tracking and pronoun resolution.

export class ConversationMemory {
  constructor() {
    this.messages = [];          // full history
    this.entities = {
      lastMentionedResource: null,
      lastMentionedTime: null,
      lastBookingCreated: null,
      lastBookingCancelled: null,
      pendingConfirmation: null,    // Action { type, data } awaiting user "YES"
      userPreferences: {
        preferredResourceType: null,
        typicalDuration: null,
        frequentLocations: []
      }
    };
  }

  setPendingAction(type, data) {
    this.entities.pendingConfirmation = { type, data, expires: Date.now() + 300000 };
  }

  getPendingAction() {
    if (!this.entities.pendingConfirmation) return null;
    if (Date.now() > this.entities.pendingConfirmation.expires) {
      this.entities.pendingConfirmation = null;
      return null;
    }
    return this.entities.pendingConfirmation;
  }

  clearPendingAction() {
    this.entities.pendingConfirmation = null;
  }

  addMessage(role, content) {
    this.messages.push({ role, content, timestamp: Date.now() });
    if (this.messages.length > 12) {
      // Keep system context + last 10 messages
      this.messages = this.messages.slice(-10);
    }
    this.extractEntities(role, content);
  }

  extractEntities(role, content) {
    if (role === 'assistant') {
      // Track resources the AI mentioned
      const resourceMatch = content.match(
        /(?:resource|room|vehicle|equipment)[:\s]+"?([^".\n]+)"?/i
      );
      if (resourceMatch) {
        this.entities.lastMentionedResource = {
          name: resourceMatch[1].trim()
        };
      }
      // Track times the AI confirmed
      const timeMatch = content.match(
        /(\d{1,2}(?::\d{2})?(?:\s?[ap]m)?)/i
      );
      if (timeMatch) {
        this.entities.lastMentionedTime = timeMatch[1];
      }
    }
  }

  resolvePronouns(userMessage) {
    if (typeof userMessage !== 'string') return userMessage;
    
    let resolved = userMessage;
    // Refined pronoun resolution to avoid over-replacement
    // We target only clear referential markers in specific contexts
    const itRefs = /\b(that room|that vehicle|the resource|that one|this one|the same)\b/gi;
    const genericIt = /\b(it|that)\b/gi;

    if (this.entities.lastMentionedResource) {
      const resourceName = `"${this.entities.lastMentionedResource.name}"`;
      
      // Always replace specific markers
      resolved = userMessage.replace(itRefs, resourceName);
      
      // Only replace generic "it" if it appears in a likely referential position
      // e.g. "book it", "cancel it", "show it", "where is it"
      const referentialContext = /\b(book|reserve|cancel|delete|show|find|where is|status of)\s+(it|that)\b/i;
      if (referentialContext.test(resolved)) {
        resolved = resolved.replace(genericIt, resourceName);
      }
    }
    return resolved;
  }

  getContextSummary() {
    const e = this.entities;
    const parts = [];
    if (e.lastMentionedResource)
      parts.push(`Last discussed resource: "${e.lastMentionedResource.name}"`);
    if (e.lastMentionedTime)
      parts.push(`Last mentioned time: ${e.lastMentionedTime}`);
    if (e.lastBookingCreated)
      parts.push(`Last booking created: ${e.lastBookingCreated.bookingId}`);
    if (e.pendingConfirmation)
      parts.push(`PENDING: User must confirm ${e.pendingConfirmation.type}`);
    return parts.length ? parts.join('\n') : 'No prior context.';
  }
}
