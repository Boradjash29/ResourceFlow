import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seed: Starting database seeding...');

  // 1. Clear existing data to ensure idempotency
  await prisma.booking.deleteMany();
  await prisma.resource.deleteMany();
  console.log('Seed: Cleared existing bookings and resources.');

  // 2. Create a single Admin User
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@resourceflow.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@resourceflow.com',
      password_hash: adminPassword,
      role: 'admin',
      status: 'active',
    },
  });

  console.log('Seed: Admin user created/verified');

  // 3. Define Office Resources
  const resources = [
    {
      name: 'Boardroom Alpha',
      type: 'meeting_room',
      capacity: 12,
      location: 'Floor 4, North Wing',
      status: 'available',
      description: 'A premium executive boardroom with a large glass table and 4K video conferencing.',
      image_url: '/images/resources/boardroom.png'
    },
    {
      name: 'Boardroom Beta',
      type: 'meeting_room',
      capacity: 10,
      location: 'Floor 4, South Wing',
      status: 'available',
      description: 'Secondary executive boardroom with integrated sound system and acoustic tiling.',
      image_url: '/images/resources/boardroom.png'
    },
    {
      name: 'Huddle Space A',
      type: 'meeting_room',
      capacity: 4,
      location: 'Floor 3, East Wing',
      status: 'available',
      description: 'Informal lounge-style meeting space for quick team syncs and brainstorms.',
      image_url: '/images/resources/huddle.png'
    },
    {
      name: 'Huddle Space B',
      type: 'meeting_room',
      capacity: 4,
      location: 'Floor 3, West Wing',
      status: 'available',
      description: 'Compact team room with acoustic panels and high-speed fiber connection.',
      image_url: '/images/resources/huddle.png'
    },
    {
      name: 'Grand Conference Hall',
      type: 'meeting_room',
      capacity: 100,
      location: 'Floor 1, Main Lobby',
      status: 'available',
      description: 'Large auditorium for town halls, keynote speeches, and major events.',
      image_url: '/images/resources/hall.png'
    },
    {
      name: 'Company Electric Van',
      type: 'vehicle',
      capacity: 8,
      location: 'Parking Level 1, Bay A1',
      status: 'available',
      description: 'Fully electric transit van for local team transport and equipment delivery.',
      image_url: '/images/resources/van.png'
    },
    {
      name: 'Executive SUV',
      type: 'vehicle',
      capacity: 5,
      location: 'Parking Level 1, Bay A2',
      status: 'available',
      description: 'Premium SUV for executive guest transport and off-site meetings.',
      image_url: '/images/resources/van.png' 
    },
    {
      name: 'MacBook Pro #01',
      type: 'laptop',
      capacity: 1,
      location: 'IT Equipment Desk, Floor 2',
      status: 'available',
      description: 'M2 Pro MacBook Pro (16-inch) for high-performance creative work.',
      image_url: '/images/resources/laptop.png'
    },
    {
      name: '4K Portable Projector',
      type: 'projector',
      capacity: 1,
      location: 'IT Equipment Desk, Floor 2',
      status: 'available',
      description: 'Ultra-bright 4K projector for presentations in any room.',
      image_url: '/images/resources/laptop.png'
    }
  ];

  console.log('Seed: Starting resource creation loop...');
  for (const resource of resources) {
    try {
      await prisma.resource.create({
        data: resource
      });
      console.log(`Seed: Created resource "${resource.name}"`);
    } catch (err) {
      console.error(`Seed ERROR creating resource "${resource.name}":`, err);
      // Don't stop the loop, keep going so we see all failures
    }
  }

  console.log(`Seed: Successfully seeded ${resources.length} resources.`);
  console.log('Seed: Complete! ✅');
}

main()
  .catch((e) => {
    console.error('Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
