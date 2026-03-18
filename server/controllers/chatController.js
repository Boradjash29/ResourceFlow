import { RAGEngine } from '../rag/engine.js';
import { syncAllResources } from '../rag/embeddings.js';
import { ConversationMemory } from '../rag/memory.js';

// Session Memory Store (Phase 2C)
const sessionMemory = new Map();

/**
 * Refactored chat controller. 
 */
export const handleAssistantChat = async (req, res) => {
  try {
    const { messages, sessionId = 'default' } = req.body;
    
    // Get or create session memory
    if (!sessionMemory.has(sessionId)) {
      sessionMemory.set(sessionId, new ConversationMemory());
    }
    const memory = sessionMemory.get(sessionId);

    // Delegate to RAG Engine
    const engine = new RAGEngine(req, messages, memory);
    const result = await engine.process();

    res.status(200).json(result);
  } catch (error) {
    console.error('Assistant Chat Error:', error);
    res.status(500).json({ message: 'Internal server error processing chat' });
  }
};

/**
 * Background utility to re-sync vector store.
 */
export const manualSync = async (req, res) => {
  try {
    const count = await syncAllResources();
    res.status(200).json({ message: `Successfully synced ${count} resources.` });
  } catch (error) {
    res.status(500).json({ message: 'Sync failed' });
  }
};
