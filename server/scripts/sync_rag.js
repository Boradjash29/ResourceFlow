// STANDALONE SCRIPT — run manually: node sync_rag.js
// Syncs resource embeddings to pgvector. Not auto-imported.
import { syncAllResources } from '../rag/embeddings.js';
import prisma from '../config/prisma.js';

async function sync() {
  console.log('Starting full vector sync...');
  const count = await syncAllResources();
  console.log(`Successfully synced ${count} resources.`);
}

sync()
  .catch(e => console.error('Sync Error:', e))
  .finally(() => prisma.$disconnect());
