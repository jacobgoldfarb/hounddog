#!/usr/bin/env node
import { readFile, stat, open } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';
import { assembleFlows, formatFlow, type EventLine } from './index';

// ─── ANSI Colors ─────────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  // Foreground
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  // Background
  bgBlack: '\x1b[40m',
  bgBlue: '\x1b[44m',
  bgCyan: '\x1b[46m',
  bgYellow: '\x1b[43m',
  bgMagenta: '\x1b[45m',
};

async function readEvents(filePath: string): Promise<EventLine[]> {
  try {
    const buf = await readFile(filePath, 'utf8');
    const lines = buf.split('\n').filter(Boolean);
    const out: EventLine[] = [];
    for (const l of lines) {
      try {
        out.push(JSON.parse(l));
      } catch {
        // ignore bad lines
      }
    }
    return out;
  } catch {
    return [];
  }
}

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main(): Promise<void> {
  const cmd = process.argv[2] || 'help';
  const pathArg = getArg('--path');
  const sinkPath = pathArg || process.env.HOUNDDOG_SINK_PATH || '.hounddog/events.jsonl';
  const filePath = resolve(process.cwd(), sinkPath);

  if (cmd === 'help' || hasFlag('--help') || hasFlag('-h')) {
    console.log(`${c.bold}${c.cyan}🐕 hound${c.reset} - request lifecycle tracer\n`);
    console.log(`${c.dim}Commands:${c.reset}`);
    console.log(`  ${c.yellow}tail${c.reset}                     Stream events in real-time`);
    console.log(`  ${c.yellow}flows last${c.reset} [-n N]        Show last N flows`);
    console.log(`  ${c.yellow}flows show${c.reset} <flowId>      Show specific flow`);
    console.log(`  ${c.yellow}flows search${c.reset} --marker X  Search for marker\n`);
    console.log(`${c.dim}Options:${c.reset}`);
    console.log(`  --path FILE              Log file path (default: .hounddog/events.jsonl)`);
    console.log(`  --from-start             Start from beginning of file (tail only)`);
    return;
  }

  if (cmd === 'flows') {
    const sub = process.argv[3];
    const events = await readEvents(filePath);
    const flows = assembleFlows(events);
    if (sub === 'last') {
      const nRaw = getArg('-n');
      const n = nRaw ? Number(nRaw) : 5;
      const latest = flows.slice(0, isNaN(n) ? 5 : n);
      for (const f of latest) process.stdout.write(formatFlow(f));
      return;
    }
    if (sub === 'show') {
      const id = process.argv[4];
      if (!id) {
        console.error('missing <flowId>');
        process.exitCode = 1;
        return;
      }
      const target = flows.find((f) => f.flowId === id);
      if (!target) {
        console.log('no such flow');
        return;
      }
      process.stdout.write(formatFlow(target));
      return;
    }
    if (sub === 'search') {
      const marker = getArg('--marker');
      if (!marker) {
        console.error('missing --marker <name>');
        process.exitCode = 1;
        return;
      }
      const matched = flows
        .map((f) => ({
          ...f,
          lines: f.lines.filter((l) => l.type === marker),
        }))
        .filter((f) => f.lines.length > 0);
      if (matched.length === 0) {
        console.log('no matches');
        return;
      }
      for (const f of matched) {
        const header = `┌─ Flow ${f.flowId} (matches: ${f.lines.length})\n`;
        const lines = f.lines
          .map((l) => `│ ${l.type} @ ${new Date(l.timestampMs).toISOString()}\n`)
          .join('');
        const footer = `└─\n`;
        process.stdout.write(header + lines + footer);
      }
      return;
    }
  }

  if (cmd === 'tail') {
    await tail(filePath, { fromStart: hasFlag('--from-start') });
    return;
  }

  console.error('unknown command');
  process.exitCode = 1;
}

void main();

// ─── Tail (live streaming) ───────────────────────────────────────────────────

interface FlowState {
  /** Last timestamp per service (to avoid cross-service clock skew) */
  lastTsByService: Map<string, number>;
  eventCount: number;
}

async function tail(filePath: string, opts: { fromStart: boolean }): Promise<void> {
  let lastSize = 0;
  try {
    const st = await stat(filePath);
    lastSize = opts.fromStart ? 0 : st.size;
  } catch {
    lastSize = 0;
  }

  const flowStates = new Map<string, FlowState>();
  const recentFlows: string[] = []; // Track order of flows
  const intervalMs = 200;
  let running = true;
  let warnedMissing = false;

  process.on('SIGINT', () => {
    running = false;
    process.stdout.write(`\n${c.dim}stopped${c.reset}\n`);
  });

  printHeader(filePath, opts.fromStart);

  while (running) {
    try {
      const st = await stat(filePath);
      warnedMissing = false;
      // Handle rotation: file shrank
      if (st.size < lastSize) {
        lastSize = 0;
        flowStates.clear();
        recentFlows.length = 0;
        process.stdout.write(`${c.dim}── log rotated ──${c.reset}\n`);
      }
      if (st.size > lastSize) {
        const fh = await open(filePath, 'r');
        const stream = fh.createReadStream({ start: lastSize, end: st.size });
        const rl = createInterface({ input: stream, crlfDelay: Infinity });
        for await (const line of rl) {
          if (!line) continue;
          try {
            const evt = JSON.parse(line) as EventLine;
            printEvent(evt, flowStates, recentFlows);
          } catch {
            // ignore bad lines
          }
        }
        await fh.close();
        lastSize = st.size;
      }
    } catch {
      if (!warnedMissing) {
        process.stdout.write(`${c.dim}waiting for ${filePath}...${c.reset}\n`);
        warnedMissing = true;
      }
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

function printHeader(filePath: string, fromStart: boolean): void {
  process.stdout.write('\n');
  process.stdout.write(`${c.bold}${c.cyan}🐕 hound tail${c.reset}\n`);
  process.stdout.write(
    `${c.dim}watching: ${filePath}${fromStart ? ' (from start)' : ''}${c.reset}\n`,
  );
  process.stdout.write(`${c.dim}${'─'.repeat(60)}${c.reset}\n\n`);
}

function layerStyle(type: string): { emoji: string; color: string; label: string } {
  if (type.startsWith('FE.')) {
    return { emoji: '🌐', color: c.cyan, label: 'FE' };
  }
  if (type.startsWith('BE.')) {
    return { emoji: '⚡', color: c.yellow, label: 'BE' };
  }
  if (type.startsWith('DB.')) {
    return { emoji: '💾', color: c.magenta, label: 'DB' };
  }
  return { emoji: '•', color: c.white, label: '??' };
}

function statusColor(status: string | number | undefined): string {
  if (status === undefined) return c.dim;
  if (typeof status === 'number') {
    if (status >= 200 && status < 300) return c.green;
    if (status >= 400) return c.red;
    return c.yellow;
  }
  if (status === 'error' || status === 'closed') return c.red;
  return c.dim;
}

function shortFlowId(id: string): string {
  return id.slice(0, 8);
}

function flowColor(flowId: string): string {
  // Consistent color per flow based on hash
  const colors = [c.cyan, c.yellow, c.magenta, c.green, c.blue] as const;
  let hash = 0;
  for (let i = 0; i < flowId.length; i++) {
    hash = (hash * 31 + flowId.charCodeAt(i)) >>> 0;
  }
  return colors[hash % colors.length] ?? c.white;
}

function printEvent(
  evt: EventLine,
  flowStates: Map<string, FlowState>,
  recentFlows: string[],
): void {
  const isNewFlow = !flowStates.has(evt.flowId);
  const state = flowStates.get(evt.flowId) || {
    lastTsByService: new Map<string, number>(),
    eventCount: 0,
  };

  // Track flow order for visual grouping
  if (isNewFlow) {
    recentFlows.unshift(evt.flowId);
    if (recentFlows.length > 10) recentFlows.pop();
  }

  // Only compute delta within same service (avoids clock skew across machines)
  const lastTsForService = state.lastTsByService.get(evt.service);
  const delta =
    lastTsForService !== undefined
      ? Math.max(0, Math.round(evt.timestampMs - lastTsForService))
      : null;
  state.lastTsByService.set(evt.service, evt.timestampMs);
  state.eventCount++;
  flowStates.set(evt.flowId, state);

  const { emoji, color, label } = layerStyle(evt.type);
  const fColor = flowColor(evt.flowId);
  const shortId = shortFlowId(evt.flowId);

  // Build the output line
  const parts: string[] = [];

  // Flow indicator (new flow gets a special header)
  if (isNewFlow) {
    process.stdout.write(
      `\n${fColor}┌──────────────────────────────────────────────────────────┐${c.reset}\n`,
    );
    process.stdout.write(
      `${fColor}│${c.reset} ${c.bold}Flow ${shortId}${c.reset} ${c.dim}started${c.reset}${' '.repeat(36)}${fColor}│${c.reset}\n`,
    );
    process.stdout.write(`${fColor}├${'─'.repeat(58)}┤${c.reset}\n`);
  }

  // Event type (with layer styling)
  const eventName = evt.type.replace(/^(FE|BE|DB)\./, '');
  const typeStr = `${emoji} ${color}${label}${c.reset}${c.dim}.${c.reset}${eventName}`;

  // Delta time (only shown for same-service events to avoid clock skew)
  let deltaStr = '';
  if (delta !== null) {
    deltaStr = delta > 0 ? `${c.dim}+${delta}ms${c.reset}` : `${c.dim}+0ms${c.reset}`;
  }

  // Status if present
  let statusStr = '';
  if (evt.status !== undefined) {
    const sColor = statusColor(evt.status);
    statusStr = ` ${sColor}${evt.status}${c.reset}`;
  }

  // Duration if present
  let durStr = '';
  if (evt.durationMs !== undefined) {
    durStr = ` ${c.dim}(${Math.round(evt.durationMs)}ms)${c.reset}`;
  }

  // Key attrs
  const attrs = evt.attrs as Record<string, unknown> | undefined;
  let attrStr = '';
  if (attrs) {
    const attrParts: string[] = [];
    if (attrs['path']) attrParts.push(`${c.dim}path=${c.reset}${attrs['path']}`);
    if (attrs['url']) {
      const url = String(attrs['url']);
      const shortUrl = url.length > 40 ? url.slice(0, 40) + '…' : url;
      attrParts.push(`${c.dim}url=${c.reset}${shortUrl}`);
    }
    if (attrs['method']) attrParts.push(`${c.dim}${attrs['method']}${c.reset}`);
    if (attrParts.length) attrStr = ` ${attrParts.join(' ')}`;
  }

  // Print event line with flow border
  process.stdout.write(
    `${fColor}│${c.reset} ${typeStr}${statusStr}${durStr}${attrStr} ${deltaStr}\n`,
  );

  // Check if this looks like a flow-ending event
  if (evt.type.endsWith('.end') && evt.type.startsWith('FE.http')) {
    process.stdout.write(`${fColor}└${'─'.repeat(58)}┘${c.reset}\n`);
  }
}
