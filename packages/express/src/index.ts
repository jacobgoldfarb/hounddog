import type { NextFunction, Request, Response } from 'express';
import { getConfig } from '@hounddog/core';
import { getFlowId, makeFlowId, withFlow } from '@hounddog/core';
import { mark } from '@hounddog/core';

export function houndMiddleware() {
  return function middleware(req: Request, res: Response, next: NextFunction) {
    const cfg = getConfig();
    const incoming = req.header(cfg.propagationHeader) || '';
    const flowId = incoming || makeFlowId();
    const start = Date.now();

    res.setHeader(cfg.propagationHeader, flowId);

    withFlow(flowId, () => {
      void mark('BE.http.start', {
        method: req.method,
        path: req.path,
      });

      const onFinish = () => {
        res.removeListener('close', onClose);
        res.removeListener('error', onError);
        void mark('BE.http.end', {
          status: res.statusCode,
          durationMs: Date.now() - start,
        });
      };
      const onClose = () => {
        res.removeListener('finish', onFinish);
        res.removeListener('error', onError);
        void mark('BE.http.end', {
          status: 'closed',
          durationMs: Date.now() - start,
        });
      };
      const onError = () => {
        res.removeListener('finish', onFinish);
        res.removeListener('close', onClose);
        void mark('BE.http.end', {
          status: 'error',
          durationMs: Date.now() - start,
        });
      };

      res.once('finish', onFinish);
      res.once('close', onClose);
      res.once('error', onError);

      next();
    });
  };
}
