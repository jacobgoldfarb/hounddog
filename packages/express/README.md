# @tailchi/express

Express middleware for tailchi. Traces incoming HTTP requests and handles frontend event flush.

## Installation

```bash
npm install @tailchi/core @tailchi/express
```

## Usage

```typescript
import express from 'express';
import { houndMiddleware } from '@tailchi/express';

const app = express();

// Add middleware (handles tracing + frontend event flush)
app.use(houndMiddleware());

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello' });
});

app.listen(4000);
```

## What It Does

1. **Extracts or creates flow ID** from incoming requests
2. **Emits events**: `http.received` (start) and `http.responded` (end)
3. **Propagates flow ID** via response header
4. **Handles `/__hound/events`** endpoint for frontend event flush

## Events Emitted

- `http.received` - Request received (with method, path)
- `http.responded` - Response sent (with status, duration)

## Frontend Integration

The middleware automatically handles POST requests to `/__hound/events`, allowing the frontend to flush events through the backend:

```typescript
// Frontend config
configureHounddog({
  service: 'web',
  sink: {
    kind: 'http',
    endpoint: 'http://localhost:4000/__hound/events',
  },
});
```

## Example Output

```
│ 📥 in.http.received GET path=/api/users +0ms
│ 📤 out.http.responded 200 (15ms) +15ms
```
