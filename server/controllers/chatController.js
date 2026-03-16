import { getAIResponse } from '../lib/ai.js';
import { findRelevantResources, syncAllResources } from '../services/embeddingService.js';

export const handleAssistantChat = async (req, res) => {
  const { messages } = req.body;
  const userText = messages[messages.length - 1].content;

  try {
    // 1. RAG: Search for relevant resources
    const relevantResources = await findRelevantResources(userText);
    
    // 2. Build Context
    const context = relevantResources
      .map(r => `[RES_ID: ${r.id}] ${r.name} (${r.type}): ${r.location}, Status: ${r.status}`)
      .join('\n');

    // 3. Get LLM response
    const aiText = await getAIResponse(messages, context);

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
