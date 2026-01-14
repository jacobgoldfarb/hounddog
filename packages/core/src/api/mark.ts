import { clock } from '../lib/clock.js';
import { getConfig, isEnabled } from '../lib/config.js';
import { getFlowId } from '../lib/context.js';
import { emitEvent } from '../sink/manager.js';
import { run } from './flow.js';

/**
 * Options for the mark function.
 */
export interface MarkOptions {
  /** Additional structured, PII-safe metadata. */
  attrs?: Record<string, unknown>;
  /** Marks this event as the terminal event of a flow. */
  flowTerminal?: boolean;
}

/**
 * Emit a single event within the current flow.
 *
 * @param name - Event name (e.g., "BE.work.start")
 * @param options - Event metadata or MarkOptions
 */
export async function mark(
  name: string,
  options?: MarkOptions | Record<string, unknown>,
): Promise<void> {
  if (!isEnabled()) return;

  const flowId = getFlowId();
  const cfg = getConfig();

  // Normalize: support both MarkOptions and legacy attrs-only usage
  const opts: MarkOptions =
    options && ('attrs' in options || 'flowTerminal' in options)
      ? (options as MarkOptions)
      : { attrs: options as Record<string, unknown> | undefined };

  if (!flowId) {
    if (cfg.orphanMark === 'createFlow') {
      await run(name, async () => {}, opts.attrs);
    }
    return;
  }

  await emitEvent({
    flowId,
    type: name,
    timestampMs: clock.nowEpochMs(),
    service: cfg.service,
    componentTag: cfg.componentTag,
    attrs: opts.attrs,
    flowTerminal: opts.flowTerminal,
  });
}

/**
 * Emit a terminal event within the current flow.
 * Convenience wrapper that sets flowTerminal: true.
 *
 * @param name - Event name
 * @param options - Event metadata
 */
export async function markAndEndFlow(
  name: string,
  options?: MarkOptions | Record<string, unknown>,
): Promise<void> {
  const opts: MarkOptions =
    options && ('attrs' in options || 'flowTerminal' in options)
      ? { ...(options as MarkOptions), flowTerminal: true }
      : { attrs: options as Record<string, unknown> | undefined, flowTerminal: true };

  await mark(name, opts);
}

