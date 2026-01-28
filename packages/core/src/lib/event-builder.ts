import { clock } from './clock.js';
import { getConfig } from './config.js';
import { getFlowContext } from './context.js';
import type { HoundEvent, EventIcon } from '../types.js';

export interface EventOptions {
  type: string;
  flowId?: string;
  flowLabel?: string;
  attrs?: Record<string, unknown>;
  durationMs?: number;
  status?: string | number;
  flowTerminal?: boolean;
  icon?: EventIcon;
}

/**
 * Build a HoundEvent with current config and context.
 * Returns null if no flow ID is available and none provided.
 */
export function buildEvent(options: EventOptions): HoundEvent | null {
  const cfg = getConfig();
  const ctx = getFlowContext();
  const flowId = options.flowId ?? ctx?.id;

  if (!flowId) {
    return null;
  }

  // Use provided label, or context label, or nothing (CLI will fall back to short ID)
  const flowLabel = options.flowLabel ?? ctx?.label;

  return {
    flowId,
    flowLabel,
    type: options.type,
    timestampMs: clock.nowEpochMs(),
    service: cfg.service,
    componentTag: cfg.componentTag,
    attrs: options.attrs,
    durationMs: options.durationMs,
    status: options.status,
    flowTerminal: options.flowTerminal,
    icon: options.icon,
  };
}

export function buildFlowEvent(
  flowId: string,
  type: string,
  attrs?: Record<string, unknown>,
  durationMs?: number,
  flowLabel?: string,
  icon?: EventIcon,
): HoundEvent {
  const cfg = getConfig();
  return {
    flowId,
    flowLabel,
    type,
    timestampMs: clock.nowEpochMs(),
    service: cfg.service,
    componentTag: cfg.componentTag,
    attrs,
    durationMs,
    icon,
  };
}
