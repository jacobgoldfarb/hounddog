// Re-export types
export type { EventLine } from './lib/events.js';

/**
 * A flow is a collection of events grouped by flowId.
 */
export type Flow = {
  flowId: string;
  lines: import('./lib/events.js').EventLine[];
  startTs: number;
  endTs: number;
};

/**
 * Assemble raw event lines into flows, sorted by most recent.
 */
export function assembleFlows(lines: import('./lib/events.js').EventLine[]): Flow[] {
  const byFlow = new Map<string, import('./lib/events.js').EventLine[]>();

  for (const line of lines) {
    if (!line?.flowId || !line.timestampMs) continue;
    const arr = byFlow.get(line.flowId) || [];
    arr.push(line);
    byFlow.set(line.flowId, arr);
  }

  const flows: Flow[] = [];
  for (const [flowId, group] of byFlow) {
    group.sort((a, b) => a.timestampMs - b.timestampMs);
    flows.push({
      flowId,
      lines: group,
      startTs: group[0]?.timestampMs || 0,
      endTs: group[group.length - 1]?.timestampMs || 0,
    });
  }

  // Most recent flows first
  flows.sort((a, b) => b.endTs - a.endTs);
  return flows;
}

/**
 * Format a flow for terminal output (simple box style).
 */
export function formatFlow(flow: Flow): string {
  const header = `┌─ Flow ${flow.flowId}`;
  const footer = `└─ ${new Date(flow.startTs).toISOString()} → ${new Date(flow.endTs).toISOString()}`;

  let out = header + '\n';
  let prevTs = flow.startTs;

  for (const line of flow.lines) {
    const delta = line.timestampMs - prevTs;
    const extras: string[] = [];
    if (line.durationMs != null) extras.push(`dur=${Math.round(line.durationMs)}ms`);
    if (line.status != null) extras.push(`status=${line.status}`);
    const suffix = extras.length ? ` [${extras.join(' ')}]` : '';
    out += `│ ${line.type} +${Math.round(delta)}ms${suffix}\n`;
    prevTs = line.timestampMs;
  }

  out += footer + '\n';
  return out;
}
