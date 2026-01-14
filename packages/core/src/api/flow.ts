import { clock } from '../lib/clock.js';
import { withFlow, makeFlowId } from '../lib/context.js';
import { buildFlowEvent } from '../lib/event-builder.js';
import { emitEvent } from '../sink/manager.js';

/**
 * Execute a function within a new flow.
 * Emits `<name>.start` and `<name>.end` events.
 *
 * @example
 * ```ts
 * const result = await run('process-order', async () => {
 *   // ... work ...
 *   return order;
 * });
 * ```
 */
export async function run<T>(
  name: string,
  fn: () => Promise<T> | T,
  attrs?: Record<string, unknown>,
): Promise<T> {
  const flowId = makeFlowId();
  const startPerf = clock.nowPerfMs();

  return withFlow(async () => {
    // Emit start
    await emitEvent(buildFlowEvent(flowId, `${name}.start`, attrs));

    try {
      return await fn();
    } finally {
      // Emit end with duration
      const durationMs = clock.nowPerfMs() - startPerf;
      await emitEvent(buildFlowEvent(flowId, `${name}.end`, attrs, durationMs));
    }
  }, flowId);
}

/**
 * Execute a frontend action within a new flow.
 * Convenience wrapper that prefixes with "FE.action.".
 *
 * @example
 * ```ts
 * await action('submit-form', async () => {
 *   await fetch('/api/submit', { method: 'POST' });
 * });
 * ```
 */
export async function action<T>(
  name: string,
  fn: () => Promise<T> | T,
  attrs?: Record<string, unknown>,
): Promise<T> {
  return run(`FE.action.${name}`, fn, attrs);
}
