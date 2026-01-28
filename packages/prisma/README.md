# @tailchi/prisma

Prisma instrumentation for tailchi. Traces all database queries with table names and timing.

## Installation

```bash
npm install @tailchi/core @tailchi/prisma @prisma/client
```

## Usage

```typescript
import { PrismaClient } from '@prisma/client';
import { instrumentPrisma } from '@tailchi/prisma';

// Wrap Prisma client (enable query logging for SQL capture)
export const prisma = instrumentPrisma(
  new PrismaClient({
    log: [{ emit: 'event', level: 'query' }],
  }),
);

// All queries are now instrumented
const users = await prisma.user.findMany();
```

## Events Emitted

For each query:

- `db.<operation>` - Query started (e.g., `db.findMany`)
- `db.<operation>.done` - Query completed (with table, duration)

## Example Output

```
│ 💾 db.findMany table=User +0ms
│ 💾 db.findMany.done table=User (12ms) +12ms
```

## Supported Operations

All Prisma model operations are traced:
- `findMany`, `findUnique`, `findFirst`
- `create`, `createMany`
- `update`, `updateMany`
- `delete`, `deleteMany`
- `upsert`
- `count`, `aggregate`, `groupBy`

## SQL Capture

To capture SQL queries (stored in event attrs), configure Prisma with query logging:

```typescript
new PrismaClient({
  log: [{ emit: 'event', level: 'query' }],
})
```

Without this, you still get table name and timing, just not the raw SQL.
