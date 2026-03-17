import { RAGEngine } from '../rag/engine.js';
import { syncAllResources } from '../rag/embeddings.js';

/**
 * Refactored chat controller. 
 * Heavy logic moved to Discrete RAG Engine (server/rag/engine.js).
 */
export const handleAssistantChat = async (req, res) => {
  try {
    const { messages } = req.body;
    
    // Delegate to RAG Engine
    const engine = new RAGEngine(req, messages);
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
