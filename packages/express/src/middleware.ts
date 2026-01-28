import type { NextFunction, Request, Response } from 'express';
import { getConfig, clock, makeFlowId, withFlow, mark } from '@tailchi/core';
import { HOUND_EVENTS_PATH } from './constants.js';
import { handleEventsRequest } from './events-handler.js';

/**
 * Create Hounddog middleware for Express.
 *
 * - Extracts or creates flow ID for each request
 * - Emits BE.http.received and BE.http.end events
 * - Propagates flow ID via response header
 * - Intercepts /__hound/events for frontend event flush
 */
export function houndMiddleware() {
  return function middleware(req: Request, res: Response, next: NextFunction) {
    // Intercept frontend event flush
    if (req.method === 'POST' && req.path === HOUND_EVENTS_PATH) {
      void handleEventsRequest(req, res);
      return;
    }

    instrumentRequest(req, res, next);
  };
}

/**
 * Instrument an incoming HTTP request.
 */
function instrumentRequest(req: Request, res: Response, next: NextFunction): void {
  const cfg = getConfig();
  const flowId = extractOrCreateFlowId(req, cfg.propagationHeader);
  const startPerf = clock.nowPerfMs();

  // Propagate flow ID to client
  res.setHeader(cfg.propagationHeader, flowId);

  void withFlow(
    () =>
      new Promise<void>((resolve) => {
        emitRequestStart(req);
        attachResponseListeners(res, startPerf, resolve);
        next();
      }),
    flowId,
  );
}

/**
 * Extract flow ID from request header or create a new one.
 */
function extractOrCreateFlowId(req: Request, headerName: string): string {
  const incoming = req.header(headerName);
  return incoming || makeFlowId();
}

function emitRequestStart(req: Request): void {
  void mark('http.received', { method: req.method, path: req.path });
}

function attachResponseListeners(
  res: Response,
  startPerf: number,
  resolve: () => void,
): void {
  const emitEnd = (status: string | number) => {
    void mark('http.responded', { status, durationMs: clock.nowPerfMs() - startPerf });
    resolve();
  };

  const onFinish = () => {
    cleanup();
    emitEnd(res.statusCode);
  };

  const onClose = () => {
    cleanup();
    emitEnd('closed');
  };

  const onError = () => {
    cleanup();
    emitEnd('error');
  };

  const cleanup = () => {
    res.removeListener('finish', onFinish);
    res.removeListener('close', onClose);
    res.removeListener('error', onError);
  };

  res.once('finish', onFinish);
  res.once('close', onClose);
  res.once('error', onError);
}

