import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import dotenv from 'dotenv';

dotenv.config();

// Parse DATABASE_URL from .env
const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';

// Create libsql adapter directly with URL
const adapter = new PrismaLibSql({
  url: databaseUrl.replace('file:', 'file:'),
});

function getPrismaClient() {
  return new PrismaClient({
    adapter,
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof getPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? getPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
