import { c } from '../lib/colors.js';
import type { EventLine, EventIcon } from '../lib/events.js';

interface LayerStyle {
  emoji: string;
  color: string;
  label: string;
}

const iconStyles: Record<EventIcon, LayerStyle> = {
  user: { emoji: '👤', color: c.blue, label: 'usr' },      // user interaction (clicks, inputs)
  http_out: { emoji: '📤', color: c.cyan, label: 'out' },  // outgoing HTTP request
  http_in: { emoji: '📥', color: c.yellow, label: 'in' },  // incoming HTTP request
  db: { emoji: '💾', color: c.magenta, label: 'db' },      // database operation
  work: { emoji: '⚙️', color: c.white, label: 'wrk' },     // generic processing (default)
  queue: { emoji: '📬', color: c.green, label: 'que' },    // message queue / job
  cache: { emoji: '🗄️', color: c.cyan, label: 'cch' },     // cache operation
  auth: { emoji: '🔐', color: c.yellow, label: 'ath' },    // authentication
  error: { emoji: '❌', color: c.red, label: 'err' },      // error / failure
  info: { emoji: 'ℹ️', color: c.dim, label: 'inf' },       // informational
};

const prefixStyles: Record<string, LayerStyle> = {
  FE: { emoji: '🌐', color: c.cyan, label: 'FE' },
  BE: { emoji: '⚡', color: c.yellow, label: 'BE' },
  DB: { emoji: '💾', color: c.magenta, label: 'DB' },
};

const inferencePatterns: [RegExp, EventIcon][] = [
  [/\b(click|tap|press|input|submit|scroll|focus|blur|hover|drag|drop)\b/i, 'user'],
  [/\bhttp\.(sent|request|fetch|responded)\b/i, 'http_out'],
  [/\bhttp\.(received|response)\b/i, 'http_in'],
  [/\b(db|query|sql|prisma|mongo|postgres|mysql)\b/i, 'db'],
  [/\b(cache|redis|memcache)\b/i, 'cache'],
  [/\b(queue|message|publish|consume|worker|job)\b/i, 'queue'],
  [/\b(auth|login|logout|session|token|signin|signout)\b/i, 'auth'],
  [/\b(error|fail|exception|crash)\b/i, 'error'],
];

function inferIcon(type: string, status?: string | number): EventIcon | null {
  if (status === 'error' || status === 'closed') return 'error';
  for (const [pattern, icon] of inferencePatterns) {
    if (pattern.test(type)) return icon;
  }
  return null;
}

export function getLayerStyle(type: string, icon?: EventIcon, status?: string | number): LayerStyle {
  if (icon && iconStyles[icon]) return iconStyles[icon];

  const prefix = type.split('.')[0] ?? '';
  if (prefix in prefixStyles) return prefixStyles[prefix]!;

  const inferred = inferIcon(type, status);
  if (inferred) return iconStyles[inferred];

  return iconStyles.work;
}

/**
 * Get color for HTTP status codes and string statuses.
 */
export function getStatusColor(status: string | number | undefined): string {
  if (status === undefined) return c.dim;
  if (typeof status === 'number') {
    if (status >= 200 && status < 300) return c.green;
    if (status >= 400) return c.red;
    return c.yellow;
  }
  if (status === 'error' || status === 'closed') return c.red;
  return c.dim;
}

/**
 * Truncate a flow ID for display.
 */
export function shortFlowId(id: string): string {
  return id.slice(0, 8);
}

/**
 * Get display name for a flow.
 * Uses flowLabel if available, otherwise truncated flowId.
 */
export function getFlowDisplayName(flowId: string, flowLabel?: string): string {
  return flowLabel ?? shortFlowId(flowId);
}

/**
 * Get a consistent color for a flow based on its ID hash.
 */
export function getFlowColor(flowId: string): string {
  const palette = [c.cyan, c.yellow, c.magenta, c.green, c.blue] as const;
  let hash = 0;
  for (let i = 0; i < flowId.length; i++) {
    hash = (hash * 31 + flowId.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length] ?? c.white;
}

/**
 * Format event attributes for display.
 */
export function formatAttrs(attrs: Record<string, unknown> | undefined): string {
  if (!attrs) return '';

  const parts: string[] = [];

  if (attrs['method']) {
    parts.push(`${c.dim}${attrs['method']}${c.reset}`);
  }
  if (attrs['path']) {
    parts.push(`${c.dim}path=${c.reset}${attrs['path']}`);
  }
  if (attrs['url']) {
    const url = String(attrs['url']);
    const shortUrl = url.length > 40 ? url.slice(0, 40) + '…' : url;
    parts.push(`${c.dim}url=${c.reset}${shortUrl}`);
  }

  return parts.length ? ` ${parts.join(' ')}` : '';
}

/**
 * Format a complete event line for terminal output.
 */
export function formatEventLine(
  evt: EventLine,
  options: {
    flowColor: string;
    delta: number | null;
  },
): string {
  const { emoji, color, label } = getLayerStyle(evt.type, evt.icon, evt.status);
  const eventName = evt.type.replace(/^(FE|BE|DB)\./, '');

  // Build components
  const typeStr = `${emoji} ${color}${label}${c.reset}${c.dim}.${c.reset}${eventName}`;

  let statusStr = '';
  if (evt.status !== undefined) {
    const sColor = getStatusColor(evt.status);
    statusStr = ` ${sColor}${evt.status}${c.reset}`;
  }

  let durStr = '';
  if (evt.durationMs !== undefined) {
    durStr = ` ${c.dim}(${Math.round(evt.durationMs)}ms)${c.reset}`;
  }

  const attrStr = formatAttrs(evt.attrs as Record<string, unknown> | undefined);

  let deltaStr = '';
  if (options.delta !== null) {
    deltaStr =
      options.delta > 0 ? `${c.dim}+${options.delta}ms${c.reset}` : `${c.dim}+0ms${c.reset}`;
  }

  return `${options.flowColor}│${c.reset} ${typeStr}${statusStr}${durStr}${attrStr} ${deltaStr}\n`;
}

/**
 * Box-drawing constants.
 */
export const box = {
  width: 58,
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  horizontal: '─',
  vertical: '│',
  leftT: '├',
  rightT: '┤',
} as const;
