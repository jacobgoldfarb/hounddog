import type { HoundEvent } from '../types';
import type { Sink } from './types';

export class NoopSink implements Sink {
  async emit(_: HoundEvent): Promise<void> {}
  async flush(): Promise<void> {}
  async close(): Promise<void> {}
}
