import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectDB() {
  const maxAttempts = 10;
  const retryDelayMs = 2000;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await prisma.$connect();
      console.log('PostgreSQL connected via Prisma');
      return;
    } catch (error) {
      const isLastAttempt = attempt === maxAttempts;

      if (isLastAttempt) {
        console.error(`PostgreSQL connection error after ${maxAttempts} attempts:`, error);
        throw error;
      }

      console.warn(
        `PostgreSQL not ready yet (attempt ${attempt}/${maxAttempts}). Retrying in ${retryDelayMs / 1000}s...`
      );
      await sleep(retryDelayMs);
    }
  }
}

export { prisma };
export default connectDB;
