import { getConfig } from '../config';
import type { HoundEvent } from '../types';
import type { Sink } from './types';
import { NoopSink } from './noop';

let sinkInstance: Sink | null = null;

async function ensureSink(): Promise<Sink> {
  if (sinkInstance) return sinkInstance;
  const cfg = getConfig();
  const kind = cfg.sink?.kind;
  if (!kind || kind === 'noop') {
    sinkInstance = new NoopSink();
    return sinkInstance;
  }
  if (kind === 'jsonl') {
    const mod = await import('./jsonl.js');
    const s: Sink = new mod.JsonlSink();
    sinkInstance = s;
    return s;
  }
  if (kind === 'http') {
    const mod = await import('./http.js');
    const s: Sink = new mod.HttpSink();
    sinkInstance = s;
    return s;
  }
  sinkInstance = new NoopSink();
  return sinkInstance;
}

export async function emitEvent(event: HoundEvent): Promise<void> {
  const sink = await ensureSink();
  await sink.emit(event);
}

export async function flushSink(): Promise<void> {
  if (!sinkInstance) {
    sinkInstance = await ensureSink();
  }
  await sinkInstance.flush();
}

export async function closeSink(): Promise<void> {
  if (!sinkInstance) {
    sinkInstance = await ensureSink();
  }
  await sinkInstance.close();
  sinkInstance = null;
}
