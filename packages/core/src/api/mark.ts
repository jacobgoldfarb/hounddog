import { isEnabled, getConfig } from '../lib/config.js';
import { getFlowId } from '../lib/context.js';
import { buildEvent } from '../lib/event-builder.js';
import { emitEvent } from '../sink/manager.js';
import { run } from './flow.js';

/**
 * Options for mark().
 */
export interface MarkOptions {
  /** Additional metadata. */
  attrs?: Record<string, unknown>;
  /** Mark as terminal event of the flow. */
  flowTerminal?: boolean;
}

/**
 * Emit an event within the current flow.
 *
 * @example
 * ```ts
 * await mark('BE.work.start');
 * await mark('BE.db.query', { attrs: { table: 'users' } });
 * ```
 */
export async function mark(
  type: string,
  options?: MarkOptions | Record<string, unknown>,
): Promise<void> {
  if (!isEnabled()) return;

  const opts = normalizeOptions(options);
  const flowId = getFlowId();

  // Handle orphan marks
  if (!flowId) {
    const cfg = getConfig();
    if (cfg.orphanMark === 'createFlow') {
      await run(type, async () => {}, opts.attrs);
    }
    return;
  }

  const event = buildEvent({
    type,
    attrs: opts.attrs,
    flowTerminal: opts.flowTerminal,
  });

  if (event) {
    await emitEvent(event);
  }
}

/**
 * Emit a terminal event (marks the flow as complete).
 *
 * @example
 * ```ts
 * await markAndEndFlow('FE.http.end', { attrs: { status: 200 } });
 * ```
 */
export async function markAndEndFlow(
  type: string,
  options?: MarkOptions | Record<string, unknown>,
): Promise<void> {
  const opts = normalizeOptions(options);
  await mark(type, { ...opts, flowTerminal: true });
}

/**
 * Normalize options to MarkOptions format.
 * Supports both { attrs: {...} } and plain attrs object.
 */
function normalizeOptions(options?: MarkOptions | Record<string, unknown>): MarkOptions {
  if (!options) return {};

  // Already MarkOptions format
  if ('attrs' in options || 'flowTerminal' in options) {
    return options as MarkOptions;
  }

  // Plain attrs object
  return { attrs: options as Record<string, unknown> };
}
