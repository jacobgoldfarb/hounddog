import type { NextFunction, Request, Response } from 'express';
import { getConfig, clock, makeFlowId, withFlow, mark, emitEvent } from '@hounddog/core';
import type { HoundEvent } from '@hounddog/core';

const HOUND_EVENTS_PATH = '/__hound/events';

export function houndMiddleware() {
  return function middleware(req: Request, res: Response, next: NextFunction) {
    // Intercept frontend event flush requests
    if (req.method === 'POST' && req.path === HOUND_EVENTS_PATH) {
      void handleEventsRequest(req, res);
      return;
    }

    const cfg = getConfig();
    const incomingReqFlowId = req.header(cfg.propagationHeader) || '';
    const flowId = incomingReqFlowId || makeFlowId();
    const startPerf = clock.nowPerfMs();

    res.setHeader(cfg.propagationHeader, flowId);

    void withFlow(
      () =>
        new Promise<void>((resolve) => {
          void mark('BE.http.received', {
            method: req.method,
            path: req.path,
          });

          const onFinish = () => {
            res.removeListener('close', onClose);
            res.removeListener('error', onError);
            void mark('BE.http.end', {
              status: res.statusCode,
              durationMs: clock.nowPerfMs() - startPerf,
            });
            resolve();
          };
          const onClose = () => {
            res.removeListener('finish', onFinish);
            res.removeListener('error', onError);
            void mark('BE.http.end', {
              status: 'closed',
              durationMs: clock.nowPerfMs() - startPerf,
            });
            resolve();
          };
          const onError = () => {
            res.removeListener('finish', onFinish);
            res.removeListener('close', onClose);
            void mark('BE.http.end', {
              status: 'error',
              durationMs: clock.nowPerfMs() - startPerf,
            });
            resolve();
          };

          res.once('finish', onFinish);
          res.once('close', onClose);
          res.once('error', onError);

          next();
        }),
      flowId,
    );
  };
}

async function handleEventsRequest(req: Request, res: Response): Promise<void> {
  // Parse JSON body if not already parsed
  let body = req.body;
  if (!body || typeof body !== 'object') {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      res.status(400).json({ error: 'invalid JSON' });
      return;
    }
  }

  const events: HoundEvent[] = body?.events;
  if (!Array.isArray(events)) {
    res.status(400).json({ error: 'expected { events: HoundEvent[] }' });
    return;
  }

  for (const event of events) {
    await emitEvent(event);
  }

  res.status(200).json({ ok: true, count: events.length });
}
