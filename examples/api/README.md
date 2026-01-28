# API Example (Express + Prisma)

Backend example with Express middleware and Prisma instrumentation.

## Prerequisites

- Node 18+
- PostgreSQL running locally
- Dependencies installed from repo root

## Setup

```bash
# 1. Install dependencies (from repo root)
pnpm install

# 2. Create database
psql -d postgres -c "CREATE DATABASE hounddog_demo;"

# 3. Set DATABASE_URL and push schema
export DATABASE_URL="postgresql://localhost:5432/hounddog_demo"
cd examples/api
npx prisma db push

# 4. Start the server
pnpm dev
```

## Endpoints

- `GET /api/hello` - Simple endpoint with work marks
- `GET /api/users` - Queries database with Prisma

## Code Highlights

### Express Middleware

```typescript
import { houndMiddleware } from '@tailchi/express';

app.use(houndMiddleware());
```

### Manual Marks

```typescript
import { mark } from '@tailchi/core';

app.get('/api/hello', async (req, res) => {
  await mark('work.start');
  await doWork();
  await mark('work.end');
  res.json({ ok: true });
});
```

### Prisma Instrumentation

```typescript
import { PrismaClient } from '@prisma/client';
import { instrumentPrisma } from '@tailchi/prisma';

export const prisma = instrumentPrisma(
  new PrismaClient({
    log: [{ emit: 'event', level: 'query' }],
  }),
);
```

## Viewing Flows

```bash
# From examples/api directory
tailchi tail .hounddog/events.jsonl
```
