import type { Request, Response } from 'express';
import { emitEvent } from '@tailchi/core';
import type { HoundEvent } from '@tailchi/core';

/**
 * Handle incoming events from frontend.
 * Parses JSON body and emits each event to the sink.
 */
export async function handleEventsRequest(req: Request, res: Response): Promise<void> {
  const body = await parseBody(req);

  if (!body) {
    res.status(400).json({ error: 'invalid JSON' });
    return;
  }

  const events: HoundEvent[] = body.events as HoundEvent[];
  if (!Array.isArray(events)) {
    res.status(400).json({ error: 'expected { events: HoundEvent[] }' });
    return;
  }

  for (const event of events) {
    await emitEvent(event);
  }

  res.status(200).json({ ok: true, count: events.length });
}

/**
 * Parse request body, handling both pre-parsed and raw bodies.
 */
async function parseBody(req: Request): Promise<{ events: unknown } | null> {
  // Already parsed by express.json()
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  // Parse raw body
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return null;
  }
}
