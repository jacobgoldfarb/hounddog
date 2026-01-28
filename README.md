# 🥋 tailchi

Distributed tracing for full-stack TypeScript apps. Watch the flow of requests across frontend, backend, and database in real-time.

## Packages

| Package | Description |
|---------|-------------|
| `@tailchi/core` | Core tracing library |
| `@tailchi/cli` | CLI for tailing flows |
| `@tailchi/fetch` | Browser fetch instrumentation |
| `@tailchi/express` | Express middleware |
| `@tailchi/prisma` | Prisma instrumentation |

## Quick Start

### 1. Install

```bash
# Backend
npm install @tailchi/core @tailchi/express

# Frontend
npm install @tailchi/core @tailchi/fetch

# Optional: Prisma instrumentation
npm install @tailchi/prisma

# CLI (global)
npm install -g @tailchi/cli
```

### 2. Backend Setup (Express)

```typescript
import express from 'express';
import { houndMiddleware } from '@tailchi/express';

const app = express();
app.use(houndMiddleware());

app.get('/api/hello', async (req, res) => {
  res.json({ message: 'Hello' });
});

app.listen(4000);
```

### 3. Frontend Setup

```typescript
import { configureHounddog } from '@tailchi/core';
import { enableHoundFetch } from '@tailchi/fetch';

configureHounddog({
  service: 'web',
  sink: {
    kind: 'http',
    endpoint: 'http://localhost:4000/__hound/events',
  },
});

enableHoundFetch();
```

### 4. Tail Flows

```bash
tailchi tail .hounddog/events.jsonl
```

Output:
```
🥋 tailchi
clock daemon: http://localhost:9999/clock
watching: .hounddog/events.jsonl

┌──────────────────────────────────────────────────────────┐
│ Flow get-users started                                   │
├──────────────────────────────────────────────────────────┤
│ 👤 usr.button.click                              +0ms
│ 📤 out.http.sent url=http://localhost:4000/api   +3ms
│ 📥 in.http.received GET path=/api/users          +5ms
│ 💾 db.findMany table=User                        +0ms
│ 💾 db.findMany.done table=User (12ms)           +12ms
│ 📤 out.http.responded 200 (15ms)                 +3ms
│ 📥 in.http.response 200 (23ms)                   +5ms
└──────────────────────────────────────────────────────────┘
```

## Configuration

### Core Config

```typescript
import { configureHounddog } from '@tailchi/core';

configureHounddog({
  service: 'api',                           // Service name
  enabled: true,                            // Enable/disable tracing
  propagationHeader: 'x-hound-flow',        // Header for flow ID propagation
  orphanMark: 'drop',                       // 'drop' | 'createFlow'
  clockDaemon: 'http://localhost:9999',     // Optional: sync clocks across services
  sink: {
    kind: 'jsonl',                          // 'jsonl' | 'http' | 'noop'
    filePath: '.hounddog/events.jsonl',
  },
});
```

### Sink Types

**JSONL (default)** - Write events to a local file:
```typescript
sink: {
  kind: 'jsonl',
  filePath: '.hounddog/events.jsonl',
  rotateBytes: 5_000_000,
  retainFiles: 3,
}
```

**HTTP** - Send events to a backend (for browser):
```typescript
sink: {
  kind: 'http',
  endpoint: 'http://localhost:4000/__hound/events',
}
```

### Clock Daemon

For accurate cross-service timing, use the clock daemon (built into CLI):

```bash
# CLI starts clock daemon on port 9999
tailchi tail .hounddog/events.jsonl
```

```typescript
// Services sync to it
configureHounddog({
  service: 'api',
  clockDaemon: 'http://localhost:9999',
});
```

## Manual Marks

```typescript
import { mark, withFlow } from '@tailchi/core';

// Mark within an existing flow
await mark('auth.validate');

// Mark with attributes
await mark('cache.miss', { attrs: { key: 'user:123' } });

// Create a new flow
withFlow(async () => {
  await mark('button.click');
  await fetch('/api/data');
}, { label: 'user-action' });
```

## Icon Inference

Events are automatically assigned icons based on their type:

| Pattern | Icon | Description |
|---------|------|-------------|
| `click`, `tap`, `submit` | 👤 | User interaction |
| `http.sent`, `http.request` | 📤 | Outgoing HTTP |
| `http.received`, `http.response` | 📥 | Incoming HTTP |
| `db`, `query`, `prisma` | 💾 | Database |
| `cache`, `redis` | 📦 | Cache |
| `queue`, `worker` | 📬 | Queue/Job |
| `auth`, `login` | 🔐 | Authentication |
| `error`, `fail` | ❌ | Error |
| Default | 🔧 | Work |

Override with explicit icon:
```typescript
await mark('custom.event', { icon: 'info' });
```

## License

MIT
