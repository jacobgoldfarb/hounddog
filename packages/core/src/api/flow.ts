import { clock } from '../lib/clock.js';
import { getConfig } from '../lib/config.js';
import { withFlow, makeFlowId } from '../lib/context.js';
import { emitEvent } from '../sink/manager.js';

/**
 * Start a new root flow and execute a function within it.
 *
 * Emits `<name>.start` and `<name>.end` events.
 * Returns the result of the function.
 *
 * @param name - Flow name (used as event prefix)
 * @param fn - Function to execute within the flow
 * @param attrs - Optional attributes for start/end events
 */
export async function run<T>(
  name: string,
  fn: () => Promise<T> | T,
  attrs?: Record<string, unknown>,
): Promise<T> {
  const cfg = getConfig();
  const flowId = makeFlowId();
  const startPerf = clock.nowPerfMs();
  const startTs = clock.nowEpochMs();

  return withFlow(async () => {
    await emitEvent({
      flowId,
      type: `${name}.start`,
      timestampMs: startTs,
      service: cfg.service,
      componentTag: cfg.componentTag,
      attrs,
    });

    try {
      return await fn();
    } finally {
      await emitEvent({
        flowId,
        type: `${name}.end`,
        timestampMs: clock.nowEpochMs(),
        service: cfg.service,
        componentTag: cfg.componentTag,
        durationMs: clock.nowPerfMs() - startPerf,
        attrs,
      });
    }
  }, flowId);
}

/**
 * Start a frontend action flow.
 * Convenience wrapper that prefixes name with "FE.action.".
 *
 * @param name - Action name
 * @param fn - Function to execute
 * @param attrs - Optional attributes
 */
export async function action<T>(
  name: string,
  fn: () => Promise<T> | T,
  attrs?: Record<string, unknown>,
): Promise<T> {
  return run(`FE.action.${name}`, fn, attrs);
}

