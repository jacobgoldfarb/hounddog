import { getConfig } from '../config';
import type { HoundEvent } from '../types';
import type { Sink } from './types';

export class HttpSink implements Sink {
  private endpoint: string;

  constructor() {
    const cfg = getConfig();
    const sink = cfg.sink;
    if (!sink || sink.kind !== 'http') {
      throw new Error('HttpSink requires sink.kind: "http"');
    }
    this.endpoint = sink.endpoint;
  }

  async emit(event: HoundEvent): Promise<void> {
    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: [event] }),
      });
    } catch {
      // Fire and forget in dev; don't block the app
    }
  }

  async flush(): Promise<void> {
    // No batching, events sent immediately
  }

  async close(): Promise<void> {
    // Nothing to close
  }
}

