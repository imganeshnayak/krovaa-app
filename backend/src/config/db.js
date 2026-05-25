import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function connectDB() {
  try {
    await prisma.$connect();
    console.log('PostgreSQL connected via Prisma');
  } catch (error) {
    console.error('PostgreSQL connection error:', error);
    throw error;
  }
}

export { prisma };
export default connectDB;
