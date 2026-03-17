import prisma from '../config/prisma.js';
import { getAIResponse } from '../lib/ai.js';
import { findRelevantResources, syncAllResources } from '../services/embeddingService.js';
import { createBookingInternal } from '../services/bookingService.js';

// --- Anti-Hallucination: Detect greetings and purely conversational messages ---
// Use + quantifier to handle repeated chars: hiiiii, heyyy, yooo, etc.
const GREETING_PATTERN = /^(hi+|he+y+|howdy|greetings|good\s*(morning|afternoon|evening|day)|what'?s up|sup+|yo+|thanks|thank you|ok+a*y*|cool|great|bye+|goodbye|sure)[!\.,?\s]*$/i;

// Broad intent pattern — use \w* after stems so "meeting", "booking", "availability", "conference" all match
// No trailing \b so partial word matches work (e.g. \bmeet\w* matches "meeting", "meetings")
const RESOURCE_INTENT_PATTERN = /\b(room\w*|space\w*|hall\w*|van\w*|vehicle\w*|laptop\w*|projector\w*|equipment|board\w*|book\w*|reserv\w*|schedul\w*|avail\w*|meet\w*|confer\w*|capac\w*|location\w*|huddle\w*)/i;

// Detect pure date/time follow-up messages (part of an ongoing booking flow)
const DATE_TIME_PATTERN = /\b(\d{1,2}\s*(am|pm)|\d{1,2}:\d{2}|january|february|march|april|may|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|next\s*week|\d{1,2}\s*(st|nd|rd|th)?)\b/i;

// Extract resource type hint from user message for DB fallback
// Also uses \w* so "meeting", "meetings", "conference" all match
const extractTypeHint = (text) => {
  if (/\bvan\w*|vehicle\w*|\bcar\b|transport\w*/i.test(text)) return 'vehicle';
  if (/\blaptop\w*|computer\w*|\bpc\b|device\w*/i.test(text))  return 'laptop';
  if (/\bprojector\w*|\bscreen\w*|display\w*/i.test(text))      return 'projector';
  if (/\broom\w*|\bhall\w*|space\w*|board\w*|meet\w*|huddle\w*|confer\w*/i.test(text)) return 'meeting_room';
  return null;
};

export const handleAssistantChat = async (req, res) => {
  const { messages } = req.body;
  const userText = messages[messages.length - 1].content.trim();

  try {
    // 1. Intent Gate: skip resource retrieval for greetings / off-topic messages
    const isGreeting        = GREETING_PATTERN.test(userText);
    const hasResourceIntent = RESOURCE_INTENT_PATTERN.test(userText);
    const isDateTimeReply   = DATE_TIME_PATTERN.test(userText) && !hasResourceIntent;
    const queryTooVague     = userText.length < 6 && !hasResourceIntent;

    // Conversation history lookback:
    // When current message lacks resource keywords (e.g. user sends "yes", a date, or a time),
    // scan ALL recent messages — both user AND assistant — to find the most recently
    // discussed resource. This ensures booking flow is maintained across turns.
    //
    // Priority order (most recent wins):
    //   1. Last assistant message that mentions a resource (catches "Would you like Boardroom Alpha?")
    //   2. Last user message with resource intent (fallback)
    let retrievalQuery = userText;
    let inBookingFlow  = false;
    if (!isGreeting && !hasResourceIntent && messages.length > 2) {
      const history = [...messages].slice(0, -1).reverse(); // from most-recent, excluding current

      // First: check if the last assistant message contains resource keywords (e.g. a suggestion)
      const lastAssistantMsg = history.find(m => m.role === 'assistant');
      if (lastAssistantMsg && RESOURCE_INTENT_PATTERN.test(lastAssistantMsg.content)) {
        retrievalQuery = lastAssistantMsg.content;
        inBookingFlow  = true;
      } else {
        // Fallback: find last user message with resource intent
        const prevUserMsg = history.find(m => m.role === 'user' && RESOURCE_INTENT_PATTERN.test(m.content));
        if (prevUserMsg) {
          retrievalQuery = prevUserMsg.content;
          inBookingFlow  = true;
        }
      }
    }

    // 2. RAG: Retrieve resources when there is intent (direct or via history)
    let relevantResources = [];
    if (!isGreeting && !queryTooVague && (hasResourceIntent || inBookingFlow)) {
      const rawResults = await findRelevantResources(retrievalQuery);
      // Confidence threshold: cosine distance < 0.65 (lower = more similar)
      relevantResources = rawResults.filter(r => r.distance == null || r.distance < 0.65);

      // DB Fallback: if vector search returned nothing useful, query DB directly
      if (relevantResources.length === 0 && (hasResourceIntent || inBookingFlow)) {
        const typeHint = extractTypeHint(retrievalQuery);
        relevantResources = await prisma.resource.findMany({
          where: {
            status: 'available',
            ...(typeHint ? { type: typeHint } : {})
          },
          take: 3,
          orderBy: { name: 'asc' }
        });
      }
    }

    // 2. Fetch User Profile, Schedule & Supplemental Context
    const [dbUser, userBookings, resourceSchedules, totalBookingsCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, name: true, role: true, created_at: true }
      }),
      prisma.booking.findMany({
        where: { user_id: req.user.id, status: 'confirmed', end_time: { gt: new Date() } },
        orderBy: { start_time: 'asc' },
        take: 3
      }),
      Promise.all(relevantResources.map(async (r) => {
        const bookings = await prisma.booking.findMany({
          where: { resource_id: r.id, status: 'confirmed', end_time: { gt: new Date() } },
          orderBy: { start_time: 'asc' },
          take: 5
        });
        return { resourceId: r.id, name: r.name, bookings };
      })),
      prisma.booking.count({ where: { user_id: req.user.id } })
    ]);

    if (!dbUser) throw new Error('User context lost');

    // 3. Build Intelligent Context
    // Top-k limitation: cap context to the 3 most relevant resources to reduce noise
    const topResources = relevantResources.slice(0, 3);
    const hasResourceContext = topResources.length > 0;

    const userContext = `USER PROFILE:
Name: ${dbUser.name}
Role: ${dbUser.role}
Member Since: ${dbUser.created_at?.toLocaleDateString()}
Activity Level: ${totalBookingsCount} total bookings

YOUR RECENT/UPCOMING SCHEDULE:
${userBookings.length > 0 
  ? userBookings.map(b => `- [BOOK_ID: ${b.id}] ${b.meeting_title}: ${b.start_time.toLocaleString()} to ${b.end_time.toLocaleTimeString()}`).join('\n')
  : 'You have no upcoming bookings.'}`;

    // Structure resource context grouped by type — so AI responds by category
    const TYPE_LABELS = {
      meeting_room: 'MEETING ROOMS',
      vehicle:      'VEHICLES',
      laptop:       'LAPTOPS / EQUIPMENT',
      projector:    'PROJECTORS / EQUIPMENT',
    };

    const resourceContext = hasResourceContext
      ? (() => {
          // Group resources by type
          const grouped = {};
          topResources.forEach(r => {
            const label = TYPE_LABELS[r.type] || 'OTHER RESOURCES';
            if (!grouped[label]) grouped[label] = [];
            const schedule = resourceSchedules.find(s => s.resourceId === r.id);
            const busyTimes = schedule?.bookings?.length > 0
              ? schedule.bookings.map(b => `Busy: ${b.start_time.toLocaleTimeString()} - ${b.end_time.toLocaleTimeString()}`).join(', ')
              : 'Fully available for the next 48h';
            grouped[label].push(
              `  [RES_ID: ${r.id}] ${r.name}\n` +
              `  Location: ${r.location} | Capacity: ${r.capacity} people | Status: ${r.status}\n` +
              `  SCHEDULE: ${busyTimes}`
            );
          });
          return Object.entries(grouped)
            .map(([label, items]) => `--- ${label} ---\n${items.join('\n\n')}`)
            .join('\n\n');
        })()
      : 'NO_RESOURCE_CONTEXT';

    const finalContext = `${userContext}\n\nRESOURCE CATALOG & REAL-TIME AVAILABILITY:\n${resourceContext}`;

    // 4. Get LLM response with resource context awareness
    let aiText = await getAIResponse(messages, finalContext, dbUser.role, dbUser.name, hasResourceContext);

    console.log(`[AI CHAT] AI Response: "${aiText}"`);
    if (hasResourceContext) {
      console.log(`[AI CHAT] Current context has ${relevantResources.length} resources.`);
    }

    // Response sanitizer: strip any markdown code fences the LLM occasionally leaks
    // e.g. ```tool_code``` or ```json ... ``` should never appear in plain-text chat
    aiText = aiText.replace(/```[\w]*\n?[\s\S]*?```/g, '').trim();

    // 4. Intercept [BOOK_ACTION]
    const actionMatch = aiText.match(/\[BOOK_ACTION:\s*({.*?})\]/);
    if (actionMatch) {
      console.log(`[AI BOOKING] Action tag detected: ${actionMatch[0]}`);
      try {
        const actionData = JSON.parse(actionMatch[1]);
        console.log(`[AI BOOKING] Parsed Action Data:`, actionData);
        let resourceIdToBook = actionData.resource_id;

        // Fallback: If AI hallucinated the resource's literal name instead of providing its UUID
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resourceIdToBook)) {
           console.log(`[AI BOOKING] AI sent non-UUID resource: "${resourceIdToBook}". Attempting fallback lookup by name.`);
           const foundResource = await prisma.resource.findFirst({
             where: { name: { contains: resourceIdToBook.trim(), mode: 'insensitive' } },
             select: { id: true, name: true }
           });
           if (foundResource) {
             console.log(`[AI BOOKING] Fallback successful. Found ${foundResource.name} with UUID: ${foundResource.id}`);
             resourceIdToBook = foundResource.id;
           } else {
             throw new Error(`Invalid resource ID or name provided: ${resourceIdToBook}`);
           }
        } else {
           console.log(`[AI BOOKING] AI sent valid UUID: ${resourceIdToBook}`);
        }

        console.log(`[AI BOOKING] Proceeding to book resource ID: ${resourceIdToBook} for User ID: ${req.user.id}`);
        const booking = await createBookingInternal({
          user_id: req.user.id,
          ...actionData,
          resource_id: resourceIdToBook
        });

        // Clean up the tag and add confirmation
        aiText = aiText.replace(actionMatch[0], '').trim();
        aiText += `\n\n✅ Done! I've booked ${booking.resource.name} for you. (${booking.start_time.toLocaleString()} - ${booking.end_time.toLocaleTimeString()})`;
      } catch (err) {
        console.error('AI Booking Interception Failed:', err);
        aiText = aiText.replace(actionMatch[0], '').trim();
        aiText += `\n\n❌ Sorry, I tried to book that for you but ran into an error: ${err.message || 'Unknown error'}.`;
      }
    }

    // 5. Intercept [ADD_RESOURCE_ACTION]
    const addResourceMatch = aiText.match(/\[ADD_RESOURCE_ACTION:\s*({.*?})\]/);
    if (addResourceMatch) {
      console.log(`[AI ADMIN] Add Resource tag detected: ${addResourceMatch[0]}`);
      try {
        if (dbUser.role !== 'admin') {
          throw new Error('Unauthorized: Only admins can add resources.');
        }

        const resourceData = JSON.parse(addResourceMatch[1]);
        console.log(`[AI ADMIN] Creating Resource:`, resourceData);

        const newResource = await prisma.resource.create({
          data: {
            ...resourceData,
            capacity: parseInt(resourceData.capacity) || 0,
            status: 'available'
          }
        });

        console.log(`[AI ADMIN] Resource created: ${newResource.id}. Triggering vector sync.`);
        
        // Background sync so we don't block the chat response
        syncAllResources().catch(err => console.error('[AI ADMIN] Vector sync failed:', err));

        // Clean up tag and add confirmation
        aiText = aiText.replace(addResourceMatch[0], '').trim();
        aiText += `\n\n✅ Resource Created! I've added "${newResource.name}" to the system. You can now manage it in the admin dashboard.`;
      } catch (err) {
        console.error('AI Resource Creation Failed:', err);
        aiText = aiText.replace(addResourceMatch[0], '').trim();
        aiText += `\n\n❌ Error creating resource: ${err.message || 'Unknown error'}.`;
      }
    }

    // 6. Intercept [UPDATE_RESOURCE_ACTION] (Admin Only)
    const updateResourceMatch = aiText.match(/\[UPDATE_RESOURCE_ACTION:\s*({.*?})\]/);
    if (updateResourceMatch) {
      console.log(`[AI ADMIN] Update Resource tag detected: ${updateResourceMatch[0]}`);
      try {
        if (dbUser.role !== 'admin') {
          throw new Error('Unauthorized: Only admins can update resources.');
        }

        const updateData = JSON.parse(updateResourceMatch[1]);
        const { resource_id, ...data } = updateData;

        console.log(`[AI ADMIN] Updating Resource ${resource_id}:`, data);

        const updatedResource = await prisma.resource.update({
          where: { id: resource_id },
          data: {
            ...data,
            capacity: data.capacity ? parseInt(data.capacity) : undefined,
            updated_at: new Date()
          }
        });

        console.log(`[AI ADMIN] Resource updated: ${updatedResource.id}. Triggering vector sync.`);
        syncAllResources().catch(err => console.error('[AI ADMIN] Vector sync failed:', err));

        aiText = aiText.replace(updateResourceMatch[0], '').trim();
        aiText += `\n\n✅ Resource Updated! I've updated "${updatedResource.name}". Changes are now live.`;
      } catch (err) {
        console.error('AI Resource Update Failed:', err);
        aiText = aiText.replace(updateResourceMatch[0], '').trim();
        aiText += `\n\n❌ Error updating resource: ${err.message || 'Unknown error'}.`;
      }
    }

    // 7. Intercept [DELETE_RESOURCE_ACTION] (Admin Only)
    const deleteResourceMatch = aiText.match(/\[DELETE_RESOURCE_ACTION:\s*({.*?})\]/);
    if (deleteResourceMatch) {
      console.log(`[AI ADMIN] Delete Resource tag detected: ${deleteResourceMatch[0]}`);
      try {
        if (dbUser.role !== 'admin') {
          throw new Error('Unauthorized: Only admins can delete resources.');
        }

        const { resource_id } = JSON.parse(deleteResourceMatch[1]);
        console.log(`[AI ADMIN] Deleting Resource: ${resource_id}`);

        // Check for future bookings first
        const bookings = await prisma.booking.findMany({
          where: {
            resource_id: resource_id,
            status: { not: 'cancelled' },
            end_time: { gt: new Date() }
          }
        });

        if (bookings.length > 0) {
          throw new Error(`This resource has ${bookings.length} future bookings. Please cancel them manually before deletion.`);
        }

        const deletedResource = await prisma.resource.delete({
          where: { id: resource_id }
        });

        console.log(`[AI ADMIN] Resource deleted: ${resource_id}. Triggering vector sync.`);
        syncAllResources().catch(err => console.error('[AI ADMIN] Vector sync failed:', err));

        aiText = aiText.replace(deleteResourceMatch[0], '').trim();
        aiText += `\n\n✅ Resource Deleted! I've removed "${deletedResource.name}" from the system. (Vector DB sync triggered)`;
      } catch (err) {
        console.error('AI Resource Deletion Failed:', err);
        aiText = aiText.replace(deleteResourceMatch[0], '').trim();
        aiText += `\n\n❌ Error deleting resource: ${err.message || 'Unknown error'}.`;
      }
    }

    // 8. Intercept [CANCEL_BOOK_ACTION]
    const cancelMatch = aiText.match(/\[CANCEL_BOOK_ACTION:\s*({.*?})\]/);
    if (cancelMatch) {
      console.log(`[AI CANCEL] Cancel tag detected: ${cancelMatch[0]}`);
      try {
        const { booking_id } = JSON.parse(cancelMatch[1]);
        
        // Verify booking ownership (unless admin)
        const booking = await prisma.booking.findUnique({
          where: { id: booking_id },
          include: { resource: true }
        });

        if (!booking) throw new Error('Booking not found.');
        if (booking.user_id !== req.user.id && req.user.role !== 'admin') {
          throw new Error('Unauthorized.');
        }

        const cancelled = await prisma.booking.update({
          where: { id: booking_id },
          data: { status: 'cancelled' },
          include: { resource: true }
        });

        console.log(`[AI CANCEL] Booking ${booking_id} cancelled.`);
        aiText = aiText.replace(cancelMatch[0], '').trim();
        aiText += `\n\n✅ Done! I've cancelled your booking for ${cancelled.resource.name} on ${cancelled.start_time.toLocaleDateString()}.`;
      } catch (err) {
        console.error('AI Cancellation Failed:', err);
        aiText = aiText.replace(cancelMatch[0], '').trim();
        aiText += `\n\n❌ Error cancelling booking: ${err.message || 'Unknown error'}.`;
      }
    }

    // ID sanitizer: strip any [RES_ID: ...] or [BOOK_ID: ...] tags the AI might repeat
    aiText = aiText.replace(/\[(RES|BOOK)_ID:[^\]]+\]\s*/g, '').trim();
    // (Move this after action interception so we don't accidentally corrupt the JSON string)
    aiText = aiText.replace(/\[RES_ID:[^\]]+\]\s*/g, '').trim();

    res.status(200).json({
      message: aiText,
      resources: relevantResources.map(r => ({ id: r.id, name: r.name }))
    });
  } catch (error) {
    console.error('Assistant Chat Error:', error);
    res.status(500).json({ message: 'Internal server error processing chat' });
  }
};

export const manualSync = async (req, res) => {
  try {
    const count = await syncAllResources();
    res.status(200).json({ message: `Successfully synced ${count} resources.` });
  } catch (error) {
    res.status(500).json({ message: 'Sync failed' });
  }
};
