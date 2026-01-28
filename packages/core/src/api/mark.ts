import { isEnabled, getConfig } from '../lib/config.js';
import { getFlowId } from '../lib/context.js';
import { buildEvent } from '../lib/event-builder.js';
import { emitEvent } from '../sink/manager.js';
import { run } from './flow.js';
import type { EventIcon } from '../types.js';

export interface MarkOptions {
  attrs?: Record<string, unknown>;
  flowTerminal?: boolean;
  icon?: EventIcon;
  status?: string | number;
  durationMs?: number;
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
    icon: opts.icon,
    status: opts.status,
    durationMs: opts.durationMs,
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

function normalizeOptions(options?: MarkOptions | Record<string, unknown>): MarkOptions {
  if (!options) return {};
  const isMarkOptions =
    'attrs' in options ||
    'flowTerminal' in options ||
    'icon' in options ||
    'status' in options ||
    'durationMs' in options;
  if (isMarkOptions) return options as MarkOptions;
  return { attrs: options as Record<string, unknown> };
}
