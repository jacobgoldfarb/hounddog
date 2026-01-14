import type { HoundEvent } from '../types';
import type { Sink } from './types';

export class NoopSink implements Sink {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async emit(_event: HoundEvent): Promise<void> {}
  async flush(): Promise<void> {}
  async close(): Promise<void> {}
}
