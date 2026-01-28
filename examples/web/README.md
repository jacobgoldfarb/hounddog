# Web Example (Browser + Fetch)

Frontend example with fetch instrumentation and flow creation.

## Prerequisites

- Node 18+
- API example running on http://localhost:4000

## Setup

```bash
# 1. Install dependencies (from repo root)
pnpm install

# 2. Start the dev server
cd examples/web
pnpm dev
```

Open http://localhost:5173

## Buttons

- **Call API** - Simple fetch (creates flow automatically)
- **Mark Button Click & Call API** - Creates flow with mark before fetch
- **Call API with DB Access** - Calls `/api/users` endpoint
- **Mark Button Click & Call API with DB Access** - Labeled flow `get-users`
- **Call Supabase** - Calls external URL (frontend-only flow)

## Code Highlights

### Configuration

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

### Manual Flows

```typescript
import { mark, withFlow } from '@tailchi/core';

button.addEventListener('click', () => {
  withFlow(
    async () => {
      await mark('button.click');
      await fetch('/api/users');
    },
    { label: 'get-users' },
  );
});
```

## Viewing Flows

Events are sent to the API server and written to `examples/api/.hounddog/events.jsonl`.

```bash
cd examples/api
tailchi tail .hounddog/events.jsonl
```
