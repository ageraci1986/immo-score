const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createDevUser() {
  console.log('Creating dev user...');

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: 'dev-user-1' },
    });

    if (existingUser) {
      console.log('✅ Dev user already exists');
      return;
    }

    // Create dev user
    const user = await prisma.user.create({
      data: {
        id: 'dev-user-1',
        clerkId: 'dev-clerk-1',
        email: 'dev@example.com',
      },
    });

    console.log('✅ Dev user created:', user);
  } catch (error) {
    console.error('❌ Failed to create dev user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDevUser();
