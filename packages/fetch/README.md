# @tailchi/fetch

Browser fetch instrumentation for tailchi. Automatically traces all fetch requests.

## Installation

```bash
npm install @tailchi/core @tailchi/fetch
```

## Usage

```typescript
import { configureHounddog } from '@tailchi/core';
import { enableHoundFetch } from '@tailchi/fetch';

// Configure core first
configureHounddog({
  service: 'web',
  sink: {
    kind: 'http',
    endpoint: 'http://localhost:4000/__hound/events',
  },
});

// Patch global fetch
enableHoundFetch();

// All fetch calls are now instrumented
await fetch('/api/users');
```

## Events Emitted

For each fetch request:

- `http.sent` - Request initiated
- `http.response` - Response received (with status and duration)

## Flow Propagation

The instrumented fetch automatically:
- Propagates flow IDs via the `x-hound-flow` header
- Creates a new flow if none exists
- Skips internal `/__hound/events` requests

## Example Output

```
│ 📤 out.http.sent url=http://localhost:4000/api/users +0ms
│ 📥 in.http.response 200 (45ms) url=http://localhost:4000/api/users +45ms
```
