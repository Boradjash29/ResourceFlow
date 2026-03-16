import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import prisma from './config/prisma.js';

dotenv.config();

async function seedAdmin() {
  const name = 'Admin User';
  const email = 'admin@resourceflow.com';
  const password = 'admin-password-123';
  
  try {
    console.log('Checking if admin exists...');
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      console.log('Admin user already exists.');
      process.exit(0);
    }

    console.log('Creating admin user...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await prisma.user.create({
      data: {
        name,
        email,
        password_hash: passwordHash,
        role: 'admin'
      }
    });

    console.log('-----------------------------------');
    console.log('Admin user created successfully!');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('-----------------------------------');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
}

seedAdmin();
