import { RAGEngine } from '../rag/engine.js';
import { syncAllResources } from '../rag/embeddings.js';
import { ConversationMemory } from '../rag/memory.js';

// Session Memory Store (Phase 2C)
// Bug 2: TTL and Size Eviction
const sessionMemory = new Map();
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes
const MAX_SESSIONS = 1000;

// Automatic Cleanup Interval (runs every 10 mins)
setInterval(() => {
  const now = Date.now();
  for (const [sid, entry] of sessionMemory.entries()) {
    if (now - entry.lastUsed > SESSION_TTL) {
      sessionMemory.delete(sid);
    }
  }
  
  // Size-based eviction
  if (sessionMemory.size > MAX_SESSIONS) {
    const toDelete = Math.floor(MAX_SESSIONS * 0.2);
    const keys = Array.from(sessionMemory.keys());
    for (let i = 0; i < toDelete; i++) sessionMemory.delete(keys[i]);
  }
}, 10 * 60 * 1000);

/**
 * Refactored chat controller. 
 */
export const handleAssistantChat = async (req, res) => {
  try {
    const { messages } = req.body;
    const userId = req.user.id;
    
    // Bug 2: Get or create with TTL (Scoped to userId)
    if (!sessionMemory.has(userId)) {
      sessionMemory.set(userId, { 
        memory: new ConversationMemory(),
        lastUsed: Date.now()
      });
    }
    const entry = sessionMemory.get(userId);
    entry.lastUsed = Date.now();
    const memory = entry.memory;

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
