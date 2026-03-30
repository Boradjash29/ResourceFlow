import { RAGEngine } from '../rag/engine.js';
import { syncAllResources } from '../rag/embeddings.js';
import { ConversationMemory } from '../rag/memory.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEMORY_FILE = path.join(__dirname, '../.session_memory.json');

// Session Memory Store (Phase 2C)
// Bug 2: TTL and Size Eviction
const sessionMemory = new Map();
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes
const MAX_SESSIONS = 1000;

// Helper to persist memory (Phase 2C - Restart Resilience)
const saveMemoryToDisk = () => {
  try {
    const data = {};
    for (const [uid, entry] of sessionMemory.entries()) {
      data[uid] = entry;
    }
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('[Memory] Failed to save to disk:', err);
  }
};

const loadMemoryFromDisk = () => {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const data = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
      for (const [uid, entry] of Object.entries(data)) {
        // Re-hydrate the class instance
        const memory = new ConversationMemory();
        Object.assign(memory, entry.memory);
        sessionMemory.set(uid, { ...entry, memory });
      }
      console.log(`[Memory] Loaded ${sessionMemory.size} sessions from disk.`);
    }
  } catch (err) {
    console.error('[Memory] Failed to load from disk:', err);
  }
};

// Initial Load
loadMemoryFromDisk();

// Automatic Cleanup & Sync Interval
setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const [sid, entry] of sessionMemory.entries()) {
    if (now - entry.lastUsed > SESSION_TTL) {
      sessionMemory.delete(sid);
      changed = true;
    }
  }
  
  if (sessionMemory.size > MAX_SESSIONS) {
    const toDelete = Math.floor(MAX_SESSIONS * 0.2);
    const keys = Array.from(sessionMemory.keys());
    for (let i = 0; i < toDelete; i++) sessionMemory.delete(keys[i]);
    changed = true;
  }

  if (changed) saveMemoryToDisk();
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

    // Save state after initialization or update
    saveMemoryToDisk();

    // Delegate to RAG Engine
    const engine = new RAGEngine(req, messages, memory);
    const result = await engine.process();

    res.status(200).json(result);
  } catch (error) {
    console.error('[Assistant Chat Error]', {
      userId: req.user?.id,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    // Detect AI Provider Errors (401, 429, etc)
    const status = error.status || 500;
    const message = error.message.includes('401') 
      ? 'AI Provider Authentication Failed (401). Please check the server API keys.' 
      : (error.message || 'Internal server error processing chat');

    res.status(status).json({ 
      message,
      code: error.code || 'UNKNOWN_ERROR'
    });
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
