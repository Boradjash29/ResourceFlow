import prisma from '../config/prisma.js';
import { getAIResponse } from '../lib/ai.js';
import { findRelevantResources, syncAllResources } from '../services/embeddingService.js';
import { createBookingInternal } from '../services/bookingService.js';

export const handleAssistantChat = async (req, res) => {
  const { messages } = req.body;
  const userText = messages[messages.length - 1].content;

  try {
    // 1. RAG: Search for relevant resources
    let relevantResources = await findRelevantResources(userText);
    
    // Fallback: If query is very short or no relevant found, get generic available resources
    if (relevantResources.length === 0 || userText.length < 5) {
      const topResources = await prisma.resource.findMany({
        where: { status: 'available' },
        take: 3
      });
      relevantResources = topResources;
    }
    
    // 2. Build Context
    const context = relevantResources.length > 0 
      ? relevantResources
        .map(r => `[RES_ID: ${r.id}] ${r.name} (${r.type}): ${r.location}, Status: ${r.status}`)
        .join('\n')
      : "The system currently has no resources listed as available.";

    // 3. Get LLM response with role awareness
    let aiText = await getAIResponse(messages, context, req.user.role);

    // 4. Intercept [BOOK_ACTION]
    const actionMatch = aiText.match(/\[BOOK_ACTION:\s*({.*?})\]/);
    if (actionMatch) {
      try {
        const actionData = JSON.parse(actionMatch[1]);
        const booking = await createBookingInternal({
          user_id: req.user.id,
          ...actionData
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
