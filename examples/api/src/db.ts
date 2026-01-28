import { PrismaClient } from '@prisma/client';
import { instrumentPrisma } from '@hounddog/prisma';

export const prisma = instrumentPrisma(
  new PrismaClient({
    log: [{ emit: 'event', level: 'query' }],
  }),
);
