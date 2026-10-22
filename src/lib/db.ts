import { PrismaClient } from '@prisma/client';

// Client Prisma en singleton : évite d'épuiser le pool de connexions
// en développement (hot reload Next.js).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
