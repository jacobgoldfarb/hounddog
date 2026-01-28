import { getConfig } from '../lib/config.js';
import type { HoundEvent } from '../types.js';
import type { Sink } from './types.js';
import { NoopSink } from './noop.js';
import { HttpSink } from './http.js';

let sinkInstance: Sink | null = null;

async function ensureSink(): Promise<Sink> {
  if (sinkInstance) return sinkInstance;

  const cfg = getConfig();
  const kind = cfg.sink?.kind;

  if (!kind || kind === 'noop') {
    sinkInstance = new NoopSink();
    return sinkInstance;
  }

  if (kind === 'http') {
    sinkInstance = new HttpSink();
    return sinkInstance;
  }

  if (kind === 'jsonl') {
    const mod = await import('./jsonl.js');
    sinkInstance = new mod.JsonlSink();
    return sinkInstance;
  }

  sinkInstance = new NoopSink();
  return sinkInstance;
}

/**
 * Emit an event to the configured sink.
 */
export async function emitEvent(event: HoundEvent): Promise<void> {
  const sink = await ensureSink();
  await sink.emit(event);
}

/**
 * Flush any buffered events to the sink.
 */
export async function flushSink(): Promise<void> {
  const sink = await ensureSink();
  await sink.flush();
}

/**
 * Close the sink and release resources.
 */
export async function closeSink(): Promise<void> {
  const sink = await ensureSink();
  await sink.close();
  sinkInstance = null;
}

