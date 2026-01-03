import type { NextFunction, Request, Response } from 'express';
import { getConfig } from '@hounddog/core';
import { clock, makeFlowId, withFlow } from '@hounddog/core';
import { mark } from '@hounddog/core';

export function houndMiddleware() {
  return function middleware(req: Request, res: Response, next: NextFunction) {
    const cfg = getConfig();
    const incomingReqFlowId = req.header(cfg.propagationHeader) || '';
    const flowId = incomingReqFlowId || makeFlowId();
    const startPerf = clock.nowPerfMs();

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
          durationMs: clock.nowPerfMs() - startPerf,
        });
      };
      const onClose = () => {
        res.removeListener('finish', onFinish);
        res.removeListener('error', onError);
        void mark('BE.http.end', {
          status: 'closed',
          durationMs: clock.nowPerfMs() - startPerf,
        });
      };
      const onError = () => {
        res.removeListener('finish', onFinish);
        res.removeListener('close', onClose);
        void mark('BE.http.end', {
          status: 'error',
          durationMs: clock.nowPerfMs() - startPerf,
        });
      };

      res.once('finish', onFinish);
      res.once('close', onClose);
      res.once('error', onError);

      next();
    });
  };
}
