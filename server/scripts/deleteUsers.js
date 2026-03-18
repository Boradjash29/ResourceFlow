import prisma from '../config/prisma.js';

async function main() {
  try {
    const { count } = await prisma.user.deleteMany({});
    console.log(`Successfully deleted ${count} users.`);
  } catch (error) {
    console.error('Error deleting users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
