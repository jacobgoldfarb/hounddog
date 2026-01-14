export type EventLine = {
  flowId: string;
  type: string;
  timestampMs: number;
  service: string;
  componentTag?: string;
  durationMs?: number;
  status?: string | number;
  attrs?: Record<string, unknown>;
};

export type Flow = {
  flowId: string;
  lines: EventLine[];
  startTs: number;
  endTs: number;
};

export function assembleFlows(lines: EventLine[]): Flow[] {
  const byFlow = new Map<string, EventLine[]>();
  for (const line of lines) {
    if (!line || !line.flowId || !line.timestampMs) continue;
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
  flows.sort((a, b) => b.endTs - a.endTs);
  return flows;
}

export function formatFlow(flow: Flow): string {
  const top = `┌─ Flow ${flow.flowId}`;
  const bottom = `└─ ${new Date(flow.startTs).toISOString()} → ${new Date(flow.endTs).toISOString()}`;
  let out = top + '\n';
  let prev = flow.startTs;
  for (const l of flow.lines) {
    const delta = l.timestampMs - prev;
    const extras: string[] = [];
    if (l.durationMs != null) extras.push(`dur=${Math.round(l.durationMs)}ms`);
    if (l.status != null) extras.push(`status=${l.status}`);
    const suffix = extras.length ? ` [${extras.join(' ')}]` : '';
    out += `│ ${l.type} +${Math.round(delta)}ms${suffix}\n`;
    prev = l.timestampMs;
  }
  out += bottom + '\n';
  return out;
}
