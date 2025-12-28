import { getConfig } from '../config';
import type { HoundEvent } from '../types';
import { JsonlSink } from './jsonl';
import type { Sink } from './types';

let sinkInstance: Sink | null = null;

function ensureSink(): Sink {
  if (sinkInstance) return sinkInstance;
  const cfg = getConfig();
  if (!cfg.sink || cfg.sink.kind === 'jsonl') {
    sinkInstance = new JsonlSink();
    return sinkInstance;
  }
  sinkInstance = new JsonlSink();
  return sinkInstance;
}

export async function emitEvent(event: HoundEvent): Promise<void> {
  const sink = ensureSink();
  await sink.emit(event);
}

export async function flushSink(): Promise<void> {
  if (!sinkInstance) return;
  await sinkInstance.flush();
}

export async function closeSink(): Promise<void> {
  if (!sinkInstance) return;
  await sinkInstance.close();
  sinkInstance = null;
}
