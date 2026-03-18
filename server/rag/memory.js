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
    this.entities.pendingConfirmation = { type, data, expires: Date.now() + 60000 };
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
    // Bug 8: Defined inside function for thread-safety and fresh lastIndex.
    // 'g' is needed because a user might say "Cancel it and that one"
    const itRefs = /\b(it|that one|this one|the same|that room|that vehicle|the resource)\b/gi;

    if (itRefs.test(userMessage) && this.entities.lastMentionedResource) {
      resolved = userMessage.replace(
        itRefs,
        `"${this.entities.lastMentionedResource.name}"`
      );
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
