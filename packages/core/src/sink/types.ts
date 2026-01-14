import type { HoundEvent } from '../types';

export interface Sink {
  emit(event: HoundEvent): Promise<void>;
  flush(): Promise<void>;
  close(): Promise<void>;
}
