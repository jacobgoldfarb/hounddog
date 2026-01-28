# @tailchi/core

Core tracing library for tailchi. Provides flow context management, event emission, and sink configuration.

## Installation

```bash
npm install @tailchi/core
```

## Usage

```typescript
import { configureHounddog, mark, withFlow } from '@tailchi/core';

// Configure once at startup
configureHounddog({
  service: 'api',
  sink: {
    kind: 'jsonl',
    filePath: '.hounddog/events.jsonl',
  },
});

// Mark events within a flow
await mark('work.start');
await mark('work.end', { durationMs: 50 });

// Create a new flow
withFlow(async () => {
  await mark('user.action');
}, { label: 'my-flow' });
```

## Configuration

```typescript
configureHounddog({
  service: 'api',                           // Required: service name
  enabled: true,                            // Enable/disable (default: true)
  propagationHeader: 'x-hound-flow',        // Flow ID header (default)
  orphanMark: 'drop',                       // What to do with marks outside flows
  clockDaemon: 'http://localhost:9999',     // Sync clocks across services
  sink: { ... },                            // Where to send events
});
```

## Sinks

### JSONL (default)
```typescript
sink: {
  kind: 'jsonl',
  filePath: '.hounddog/events.jsonl',
  rotateBytes: 5_000_000,    // Rotate at 5MB
  retainFiles: 3,            // Keep 3 rotated files
  batchMax: 64,              // Batch up to 64 events
  flushIntervalMs: 250,      // Flush every 250ms
}
```

### HTTP (for browser)
```typescript
sink: {
  kind: 'http',
  endpoint: 'http://localhost:4000/__hound/events',
}
```

### Noop (disable)
```typescript
sink: { kind: 'noop' }
```

## API

### `configureHounddog(config)`
Configure the library. Call once at startup.

### `mark(type, options?)`
Emit an event within the current flow.

```typescript
await mark('db.query', {
  attrs: { table: 'users' },
  status: 200,
  durationMs: 15,
  icon: 'db',
});
```

### `withFlow(fn, options?)`
Execute a function within a new flow context.

```typescript
withFlow(async () => {
  // Events here belong to this flow
}, { label: 'my-flow' });
```

### `getFlowId()`
Get the current flow ID (or undefined).

### `clock`
Access the clock for timing:
```typescript
import { clock } from '@tailchi/core';
const start = clock.nowPerfMs();
// ... work ...
const duration = clock.nowPerfMs() - start;
```
