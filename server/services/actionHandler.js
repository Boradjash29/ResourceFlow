import prisma from '../config/prisma.js';
import { canPerformAction, getDenialMessage } from '../config/permissions.js';
import { createBookingInternal } from './bookingService.js';
import { createAuditLog } from './auditService.js';
import { syncAllResources } from '../rag/embeddings.js';

/**
 * Handles parsing and execution of AI-triggered actions with strict role-based validation.
 */
export class ActionHandler {
  constructor(req, aiText, relevantResources, messages) {
    this.req = req;
    this.user = req.user;
    this.aiText = aiText;
    this.relevantResources = relevantResources;
    this.messages = messages;
    this.memory = req.memory; // Injected by engine
    this.processedText = aiText;
  }

  /**
   * Main entry point to process all action tags in the AI response.
   */
  async processActions() {
    const actionTypes = [
      'BOOK_ACTION',
      'UPDATE_BOOKING_ACTION',
      'CANCEL_BOOK_ACTION',
      'ADD_RESOURCE_ACTION',
      'UPDATE_RESOURCE_ACTION',
      'DELETE_RESOURCE_ACTION'
    ];

    for (const type of actionTypes) {
      const pattern = new RegExp(`\\[${type}:\\s*({.*?})\\]`, 'g');
      let match;
      
      // We use a while loop in case the AI emits multiple actions (though rare)
      while ((match = pattern.exec(this.aiText)) !== null) {
        try {
          if (!canPerformAction(this.user.role, type)) {
            const denial = getDenialMessage(type);
            this.processedText = this.processedText.replace(match[0], `\n\n❌ **Unauthorized**: ${denial}`).trim();
            continue;
          }

          const actionData = this.tryLenientParse(match[1]);
          if (!actionData) {
            this.processedText = this.processedText.replace(match[0], `\n\n❌ **Syntax Error**: I couldn't understand the action parameters.`).trim();
            continue;
          }

          const validationError = this.validateActionData(type, actionData);
          if (validationError) {
            this.processedText = this.processedText.replace(match[0], `\n\n❌ **Validation Failed**: ${validationError}`).trim();
            continue;
          }
          
          // Bug 3: Strict Mandatory confirmation for destructive actions
          const isDestructive = ['CANCEL_BOOK_ACTION', 'DELETE_RESOURCE_ACTION'].includes(type);
          const pending = this.memory.getPendingAction();
          const lastUserMsg = this.req.body.messages.slice(-1)[0].content.trim().toUpperCase();
          const isConfirmed = lastUserMsg === 'YES' && pending && pending.type === type;

          if (isDestructive && !isConfirmed) {
            // Use uuid as unique actionId if available
            const actionId = actionData.resource_id || actionData.booking_id || Math.random().toString(36).substring(7);
            this.memory.setPendingAction(type, { ...actionData, actionId });
            
            const resourceName = actionData.resource_name || 'this resource';
            this.processedText = this.processedText.replace(match[0], `⚠️ **Confirmation Required**: Are you sure you want to ${type === 'CANCEL_BOOK_ACTION' ? 'cancel the booking for' : 'delete'} ${resourceName}? Please say **YES** to proceed.`).trim();
            continue;
          }

          let resultMessage = "";
          switch (type) {
            case 'BOOK_ACTION':           resultMessage = await this.handleBook(actionData, match[0]); break;
            case 'UPDATE_BOOKING_ACTION': resultMessage = await this.handleUpdateBooking(actionData, match[0]); break;
            case 'CANCEL_BOOK_ACTION':   
              resultMessage = await this.handleCancelBooking(actionData, match[0]); 
              this.memory.clearPendingAction();
              break;
            case 'ADD_RESOURCE_ACTION':    resultMessage = await this.handleAddResource(actionData, match[0]); break;
            case 'UPDATE_RESOURCE_ACTION': resultMessage = await this.handleUpdateResource(actionData, match[0]); break;
            case 'DELETE_RESOURCE_ACTION': 
              resultMessage = await this.handleDeleteResource(actionData, match[0]); 
              this.memory.clearPendingAction();
              break;
          }

          this.processedText = this.processedText.replace(match[0], `\n\n${resultMessage}`).trim();

        } catch (err) {
          console.error(`[ActionHandler] Error processing ${type}:`, err);
          this.processedText = this.processedText.replace(match[0], `\n\n❌ **Error**: ${err.message || 'Operation failed'}`).trim();
        }
      }
    }

    // Phase 6B: Comprehensive Response Sanitization
    this.processedText = this.processedText
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[ID_REDACTED]')
      .replace(/\[[A-Z_]+_ACTION:.*?\]/gi, '') // residual tags
      .replace(/\[(RES|BOOK|USER)_ID:[^\]]+\]/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    return this.processedText;
  }

  // --- Action Specific Handlers ---

  async handleBook(data, originalTag) {
    let resourceId = data.resource_id;
    const participantCount = parseInt(data.participant_count) || 0;
    
    // Robust UUID Fallback
    if (!this.isValidUUID(resourceId)) {
      resourceId = await this.resolveResourceId(resourceId);
    }

    // 1. Validate resource & status
    const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource) throw new Error('I couldn\'t find that specific resource in our system.');
    if (resource.status === 'unavailable') throw new Error(`${resource.name} is currently under maintenance or unavailable.`);

    // 2. Capacity Check
    if (resource.capacity && participantCount > resource.capacity) {
      throw new Error(`This ${resource.type.replace('_', ' ')} holds ${resource.capacity} people. You need ${participantCount}. Please choose a larger room.`);
    }

    // 3. Time Validations
    const start = new Date(data.start_time);
    const end = new Date(data.end_time);
    const now = new Date();

    if (isNaN(start) || isNaN(end) || start >= end) {
      throw new Error('The start time must be before the end time.');
    }
    if (start < now) {
      throw new Error('I cannot book resources in the past. Please choose a future time.');
    }

    const durationMinutes = (end - start) / (1000 * 60);
    if (durationMinutes < 30) {
      throw new Error('Meetings must be at least 30 minutes long.');
    }

    const booking = await createBookingInternal({
      user_id: this.user.id,
      ...data,
      resource_id: resourceId,
      participants: [] // We use description or count for now
    });

    // Phase 4C: Feedback Loop
    this.memory.entities.lastBookingCreated = { bookingId: booking.id, resourceId };

    await createAuditLog({
      userId: this.user.id,
      action: 'CREATE',
      entityType: 'booking',
      entityId: booking.id,
      details: { title: booking.meeting_title, resource_id: resourceId, source: 'ai_chat' },
      ipAddress: this.req.ip,
      userAgent: this.req.headers['user-agent']
    });

    return `✅ **Booking Confirmed!** I've booked ${booking.resource.name} for you. (${new Date(booking.start_time).toLocaleString()} - ${new Date(booking.end_time).toLocaleTimeString()})`;
  }

  async handleUpdateBooking(data, originalTag) {
    const { booking_id, ...updateData } = data;
    const participantCount = parseInt(updateData.participant_count) || 0;
    
    // Ownership check
    const existing = await prisma.booking.findUnique({
      where: { id: booking_id },
      include: { resource: true }
    });

    if (!existing) throw new Error('I couldn\'t find that booking to update.');
    if (existing.user_id !== this.user.id && this.user.role !== 'admin') {
      throw new Error('Unauthorized: You can only update your own bookings.');
    }

    // Capacity Check on Update
    if (existing.resource.capacity && participantCount > existing.resource.capacity) {
      throw new Error(`The ${existing.resource.name} holds ${existing.resource.capacity} people. Your update for ${participantCount} exceeds this.`);
    }

    const startTime = updateData.start_time ? new Date(updateData.start_time) : undefined;
    const endTime = updateData.end_time ? new Date(updateData.end_time) : undefined;

    if (startTime && startTime < new Date()) {
      throw new Error('Updates must be for future times.');
    }

    const updated = await prisma.booking.update({
      where: { id: booking_id },
      data: {
        meeting_title: updateData.title || undefined,
        start_time: startTime,
        end_time: endTime,
        updated_at: new Date()
      },
      include: { resource: true }
    });

    await createAuditLog({
      userId: this.user.id,
      action: 'UPDATE',
      entityType: 'booking',
      entityId: booking_id,
      details: { old: existing, new: updated, source: 'ai_chat' },
      ipAddress: this.req.ip,
      userAgent: this.req.headers['user-agent']
    });

    return `✅ **Booking Updated!** The new details for ${updated.resource.name} are set.`;
  }

  async handleCancelBooking(data, originalTag) {
    const { booking_id } = data;
    const booking = await prisma.booking.findUnique({
      where: { id: booking_id },
      include: { resource: true }
    });

    if (!booking) throw new Error('Booking not found.');
    if (booking.user_id !== this.user.id && this.user.role !== 'admin') {
      throw new Error('Unauthorized: You can only cancel your own bookings.');
    }

    const cancelled = await prisma.booking.update({
      where: { id: booking_id },
      data: { status: 'cancelled', updated_at: new Date() },
      include: { resource: true }
    });

    // Phase 4C: Feedback Loop
    this.memory.entities.lastBookingCancelled = { bookingId: booking_id };

    await createAuditLog({
      userId: this.user.id,
      action: 'CANCEL',
      entityType: 'booking',
      entityId: booking_id,
      details: { resource_name: cancelled.resource.name, source: 'ai_chat' },
      ipAddress: this.req.ip,
      userAgent: this.req.headers['user-agent']
    });

    return `✅ **Booking Cancelled.** I've removed your reservation for ${cancelled.resource.name} on ${new Date(cancelled.start_time).toLocaleDateString()}.`;
  }

  async handleAddResource(data, originalTag) {
    const newResource = await prisma.resource.create({
      data: {
        ...data,
        capacity: parseInt(data.capacity) || 0,
        status: 'available'
      }
    });

    await createAuditLog({
      userId: this.user.id,
      action: 'CREATE',
      entityType: 'resource',
      entityId: newResource.id,
      details: { name: newResource.name, type: newResource.type, source: 'ai_chat' },
      ipAddress: this.req.ip,
      userAgent: this.req.headers['user-agent']
    });

    syncAllResources().catch(e => console.error('[ActionHandler] Background sync failed:', e));

    return `✅ **Resource Added!** I've created "${newResource.name}" in the system.`;
  }

  async handleUpdateResource(data, originalTag) {
    const { resource_id, ...updateData } = data;
    const updated = await prisma.resource.update({
      where: { id: resource_id },
      data: {
        ...updateData,
        capacity: updateData.capacity ? parseInt(updateData.capacity) : undefined,
        updated_at: new Date()
      }
    });

    await createAuditLog({
      userId: this.user.id,
      action: 'UPDATE',
      entityType: 'resource',
      entityId: updated.id,
      details: { name: updated.name, changes: updateData, source: 'ai_chat' },
      ipAddress: this.req.ip,
      userAgent: this.req.headers['user-agent']
    });

    syncAllResources().catch(e => console.error('[ActionHandler] Background sync failed:', e));

    return `✅ **Resource Updated!** I've modified "${updated.name}" successfully.`;
  }

  async handleDeleteResource(data, originalTag) {
    const { resource_id } = data;
    
    // Safety check: future bookings?
    const futureBookings = await prisma.booking.count({
      where: { resource_id, status: { not: 'cancelled' }, end_time: { gt: new Date() } }
    });

    if (futureBookings > 0) {
      throw new Error(`This resource has ${futureBookings} active future bookings. Please cancel them manually before deleting.`);
    }

    const deleted = await prisma.resource.delete({ where: { id: resource_id } });

    await createAuditLog({
      userId: this.user.id,
      action: 'DELETE',
      entityType: 'resource',
      entityId: resource_id,
      details: { name: deleted.name, source: 'ai_chat' },
      ipAddress: this.req.ip,
      userAgent: this.req.headers['user-agent']
    });

    syncAllResources().catch(e => console.error('[ActionHandler] Background sync failed:', e));

    return `✅ **Resource Deleted!** I've removed "${deleted.name}" from the system.`;
  }

  // --- Helpers ---

  isValidUUID(id) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  }

  async resolveResourceId(placeholder) {
    // 1. History scan
    const historyText = this.messages.slice(-5).map(m => m.content).join(' ') + ' ' + this.aiText;
    const matchInHistory = this.relevantResources.find(r => 
      historyText.toLowerCase().includes(r.name.toLowerCase())
    );
    if (matchInHistory) return matchInHistory.id;

    // 2. Name search
    const cleanName = placeholder.replace(/[_-]/g, ' ').replace(/resource_id|uuid|actual/gi, '').trim();
    if (cleanName.length > 2) {
      const dbMatch = await prisma.resource.findFirst({
        where: { name: { contains: cleanName, mode: 'insensitive' } },
        select: { id: true }
      });
      if (dbMatch) return dbMatch.id;
    }

    throw new Error(`Could not identify resource "${placeholder}". Please specify it clearly by name.`);
  }

  tryLenientParse(jsonString) {
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      // Lenient fix: Add missing quotes to keys, handle trailing commas
      let fixed = jsonString
        .replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3') // quote keys
        .replace(/,\s*([}\]])/g, '$1'); // remove trailing commas
      try {
        return JSON.parse(fixed);
      } catch (e2) {
        return null;
      }
    }
  }

  validateActionData(type, data) {
    if (type === 'BOOK_ACTION' || type === 'UPDATE_BOOKING_ACTION') {
      if (data.start_time && isNaN(Date.parse(data.start_time))) return "Invalid start time format.";
      if (data.end_time && isNaN(Date.parse(data.end_time))) return "Invalid end time format.";
      if (data.participant_count && (isNaN(data.participant_count) || data.participant_count < 1)) return "Participant count must be at least 1.";
    }
    if (type === 'ADD_RESOURCE_ACTION' || type === 'UPDATE_RESOURCE_ACTION') {
      if (data.capacity && (isNaN(data.capacity) || data.capacity < 1)) return "Capacity must be a positive number.";
      if (type === 'ADD_RESOURCE_ACTION' && (!data.name || !data.type)) return "Name and type are required for new resources.";
    }
    return null;
  }
}
