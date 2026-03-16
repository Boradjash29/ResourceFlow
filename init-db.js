import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from './server/config/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.join(__dirname, 'database', 'schema.sql');

async function initDb() {
  try {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    console.log('Initializing database schema with Prisma...');
    
    // Execute the schema script using raw queries
    // Unsafety note: This is a setup script executing a trusted local file.
    await prisma.$executeRawUnsafe(schema);
    
    console.log('Database initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initDb();
