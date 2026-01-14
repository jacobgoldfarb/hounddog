import { clock } from './clock';
import { getConfig, isEnabled } from './config';
import { getFlowId, makeFlowId, withFlow } from './context';
import { emitEvent } from './sink/index';

/**
 * Emit a single event within the current flow.
 *
 * - No-ops if disabled.
 * - If no active flow and `orphanMark` is `createFlow`, a new flow is started and ended around a no-op.
 * - Uses wall-clock for `timestampMs` and monotonic `durationMs` where applicable (not used by mark).
 */
export async function mark(name: string, attrs?: Record<string, unknown>): Promise<void> {
  if (!isEnabled()) return;

  const flowId = getFlowId();
  const cfg = getConfig();

  if (!flowId) {
    if (cfg.orphanMark === 'createFlow') {
      await run(name, async () => {}, attrs);
    }
    return;
  }

  await emitEvent({
    flowId,
    type: name,
    timestampMs: clock.nowEpochMs(),
    service: cfg.service,
    componentTag: cfg.componentTag,
    attrs,
  });
}

/**
 * Start a new root flow and execute `fn` within it.
 *
 * Emits `<name>.start` and `<name>.end` bounded to the new flow id.
 * Returns the result of `fn`, always emitting the end event even on errors.
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

  return await withFlow(flowId, async () => {
    await emitEvent({
      flowId,
      type: `${name}.start`,
      timestampMs: startTs,
      service: cfg.service,
      componentTag: cfg.componentTag,
      attrs,
    });
    try {
      const result = await fn();
      return result;
    } finally {
      const endPerf = clock.nowPerfMs();
      const endTs = clock.nowEpochMs();
      await emitEvent({
        flowId,
        type: `${name}.end`,
        timestampMs: endTs,
        service: cfg.service,
        componentTag: cfg.componentTag,
        durationMs: endPerf - startPerf,
        attrs,
      });
    }
  });
}

export { withFlow, getFlowId, makeFlowId };

/**
 * Frontend action helper. Starts a new flow for a UI action and runs `fn`.
 * Events emitted within `fn` (including fetch) will attach to this flow.
 */
export async function action<T>(
  name: string,
  fn: () => Promise<T> | T,
  attrs?: Record<string, unknown>,
): Promise<T> {
  return run(`FE.action.${name}`, fn, attrs);
}
