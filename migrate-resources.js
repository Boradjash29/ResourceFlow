import prisma from './server/config/prisma.js';

const migrate = async () => {
  try {
    console.log('Starting migration with Prisma...');
    
    // Add description column
    await prisma.$executeRaw`ALTER TABLE resources ADD COLUMN IF NOT EXISTS description TEXT;`;
    console.log('Added description column');

    // Update type constraint
    await prisma.$executeRaw`ALTER TABLE resources DROP CONSTRAINT IF EXISTS resources_type_check;`;
    await prisma.$executeRaw`ALTER TABLE resources ADD CONSTRAINT resources_type_check CHECK (type IN ('meeting_room', 'projector', 'laptop', 'conference_hall', 'equipment', 'parking', 'desk', 'other'));`;
    console.log('Updated type constraint');

    console.log('Migration successful');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

migrate();
