import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

// Reuse a single client across hot reloads (tsx watch / Next dev) instead
// of opening a fresh connection pool on every reload.
export const prisma = globalThis.__prismaClient ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prismaClient = prisma;
}
