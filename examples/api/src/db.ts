import { PrismaClient } from '@prisma/client';
import { instrumentPrisma } from '@tailchi/prisma';

export const prisma = instrumentPrisma(
  new PrismaClient({
    log: [{ emit: 'event', level: 'query' }],
  }),
);
