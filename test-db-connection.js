const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function testConnection() {
  console.log('Testing database connection...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

  try {
    // Test simple query
    await prisma.$connect();
    console.log('✅ Successfully connected to database!');

    // Try to query the users table
    const userCount = await prisma.user.count();
    console.log(`✅ Database query successful! Users count: ${userCount}`);

    // Try to query properties table
    const propertyCount = await prisma.property.count();
    console.log(`✅ Properties count: ${propertyCount}`);

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
