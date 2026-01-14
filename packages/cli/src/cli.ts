#!/usr/bin/env node
import { readFile, stat, open } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';
import { assembleFlows, formatFlow, type EventLine } from './index';

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
    console.log('hound flows last [-n N] [--path FILE]');
    console.log('hound flows show <flowId> [--path FILE]');
    console.log('hound flows search --marker <name> [--path FILE]');
    console.log('hound tail [--path FILE] [--from-start]');
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

// --- Tail (live log) ---
async function tail(filePath: string, opts: { fromStart: boolean }): Promise<void> {
  let lastSize = 0;
  try {
    const st = await stat(filePath);
    lastSize = opts.fromStart ? 0 : st.size;
  } catch {
    lastSize = 0;
  }
  const lastTsByFlow = new Map<string, number>();
  const intervalMs = 300;
  let running = true;
  let warnedMissing = false;

  process.on('SIGINT', () => {
    running = false;
  });

  process.stdout.write(`tailing ${filePath}${opts.fromStart ? ' (from start)' : ''}\n`);

  while (running) {
    try {
      const st = await stat(filePath);
      warnedMissing = false;
      // rotation: file shrank
      if (st.size < lastSize) {
        lastSize = 0;
      }
      if (st.size > lastSize) {
        const fh = await open(filePath, 'r');
        const end = Math.max(lastSize, st.size - 1);
        const stream = fh.createReadStream({ start: lastSize, end });
        const rl = createInterface({ input: stream, crlfDelay: Infinity });
        for await (const line of rl) {
          if (!line) continue;
          try {
            const evt = JSON.parse(line) as EventLine;
            printLive(evt, lastTsByFlow);
          } catch {
            // ignore bad lines
          }
        }
        await fh.close();
        lastSize = st.size;
      }
    } catch {
      // ignore missing file until it appears
      if (!warnedMissing) {
        process.stdout.write(`waiting for ${filePath}...\n`);
        warnedMissing = true;
      }
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

function emojiFor(type: string): string {
  if (type.startsWith('FE.')) return '✨';
  if (type.startsWith('BE.')) return '⚙️';
  if (type.startsWith('DB.')) return '🗄️';
  return '•';
}

function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) + '…' : id;
}

function printLive(evt: EventLine, lastTsByFlow: Map<string, number>): void {
  const prev = lastTsByFlow.get(evt.flowId) ?? evt.timestampMs;
  const delta = Math.max(0, Math.round(evt.timestampMs - prev));
  lastTsByFlow.set(evt.flowId, evt.timestampMs);
  const parts: string[] = [];
  parts.push(emojiFor(evt.type));
  parts.push(evt.type);
  parts.push(`+${delta}ms`);
  const extras: string[] = [];
  if (evt.durationMs != null) extras.push(`dur=${Math.round(evt.durationMs)}ms`);
  if (evt.status != null) extras.push(`status=${evt.status}`);
  if (evt.attrs && typeof evt.attrs === 'object') {
    const a = evt.attrs as Record<string, unknown>;
    if (a['path']) extras.push(`path=${a['path'] as string}`);
    if (a['url']) extras.push(`url=${a['url'] as string}`);
    if (a['model']) extras.push(`model=${a['model'] as string}`);
    if (a['action']) extras.push(`action=${a['action'] as string}`);
  }
  const suffix = extras.length ? ` [${extras.join(' ')}]` : '';
  process.stdout.write(`${parts.join(' ')} ${suffix}  (${shortId(evt.flowId)})\n`);
}
