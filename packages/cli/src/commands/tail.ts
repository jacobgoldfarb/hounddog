import { stat, open } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { createServer, type Server } from 'node:http';
import { c } from '../lib/colors.js';
import { parseEventLine, type EventLine } from '../lib/events.js';
import { formatEventLine, getFlowColor, getFlowDisplayName, box } from '../format/event.js';
import { hasFlag, getFlagValue, type ParsedArgs } from '../lib/args.js';

interface FlowState {
  lastTs: number;
  lastWallTime: number;
  eventCount: number;
  color: string;
}

interface TailOptions {
  fromStart: boolean;
  clockPort: number | null;
}

let clockServer: Server | null = null;

export async function runTail(args: ParsedArgs): Promise<void> {
  const portStr = getFlagValue(args, '--clock-port');
  const options: TailOptions = {
    fromStart: hasFlag(args, '--from-start'),
    clockPort: portStr ? parseInt(portStr, 10) : 9999,
  };

  if (options.clockPort) {
    clockServer = startClockServer(options.clockPort);
  }

  await streamEvents(args.filePath, options);
}

function startClockServer(port: number): Server {
  const server = createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    if (req.url === '/clock') {
      res.end(JSON.stringify({ epochMs: Date.now() }));
    } else {
      res.statusCode = 404;
      res.end('{}');
    }
  });

  server.listen(port, () => {
    process.stdout.write(`${c.dim}clock daemon: http://localhost:${port}/clock${c.reset}\n`);
  });

  return server;
}

async function streamEvents(filePath: string, opts: TailOptions): Promise<void> {
  let lastSize = 0;
  try {
    const st = await stat(filePath);
    lastSize = opts.fromStart ? 0 : st.size;
  } catch {
    lastSize = 0;
  }

  const flowStates = new Map<string, FlowState>();
  const recentFlows: string[] = [];
  const intervalMs = 200;
  const idleTimeoutMs = 2000;
  let running = true;
  let warnedMissing = false;

  process.on('SIGINT', () => {
    running = false;
    if (clockServer) clockServer.close();
    process.stdout.write(`\n${c.dim}stopped${c.reset}\n`);
    process.exit(0);
  });

  printHeader(filePath, opts);

  while (running) {
    try {
      const st = await stat(filePath);
      warnedMissing = false;

      // Handle log rotation (file shrank)
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
          const evt = parseEventLine(line);
          if (evt) {
            printEvent(evt, flowStates, recentFlows);
          }
        }

        await fh.close();
        lastSize = st.size;
      }

      closeIdleFlows(flowStates, recentFlows, idleTimeoutMs);
    } catch {
      if (!warnedMissing) {
        process.stdout.write(`${c.dim}waiting for ${filePath}...${c.reset}\n`);
        warnedMissing = true;
      }
    }

    await sleep(intervalMs);
  }
}

function printHeader(filePath: string, opts: TailOptions): void {
  process.stdout.write('\n');
  process.stdout.write(`${c.bold}${c.cyan}🥋 tailchi${c.reset}\n`);
  process.stdout.write(`${c.dim}watching: ${filePath}${opts.fromStart ? ' (from start)' : ''}${c.reset}\n`);
  process.stdout.write(`${c.dim}${'─'.repeat(60)}${c.reset}\n\n`);
}

function printEvent(
  evt: EventLine,
  flowStates: Map<string, FlowState>,
  recentFlows: string[],
): void {
  const isNewFlow = !flowStates.has(evt.flowId);
  const flowColor = getFlowColor(evt.flowId);
  const state = flowStates.get(evt.flowId) || {
    lastTs: evt.timestampMs,
    lastWallTime: Date.now(),
    eventCount: 0,
    color: flowColor,
  };

  if (isNewFlow) {
    recentFlows.unshift(evt.flowId);
    if (recentFlows.length > 10) recentFlows.pop();
  }

  const delta = isNewFlow ? 0 : Math.max(0, Math.round(evt.timestampMs - state.lastTs));
  state.lastTs = evt.timestampMs;
  state.lastWallTime = Date.now();
  state.eventCount++;
  flowStates.set(evt.flowId, state);

  // Print flow header for new flows
  if (isNewFlow) {
    printFlowStart(evt.flowId, evt.flowLabel, flowColor);
  }

  // Print event line
  process.stdout.write(formatEventLine(evt, { flowColor, delta }));

  // Print flow footer for terminal events
  if (evt.flowTerminal) {
    printFlowEnd(flowColor);
    flowStates.delete(evt.flowId);
    const idx = recentFlows.indexOf(evt.flowId);
    if (idx !== -1) recentFlows.splice(idx, 1);
  }
}

function closeIdleFlows(
  flowStates: Map<string, FlowState>,
  recentFlows: string[],
  idleTimeoutMs: number,
): void {
  const now = Date.now();
  for (const [flowId, state] of flowStates) {
    if (now - state.lastWallTime > idleTimeoutMs) {
      printFlowEnd(state.color);
      flowStates.delete(flowId);
      const idx = recentFlows.indexOf(flowId);
      if (idx !== -1) recentFlows.splice(idx, 1);
    }
  }
}

function printFlowStart(flowId: string, flowLabel: string | undefined, flowColor: string): void {
  const displayName = getFlowDisplayName(flowId, flowLabel);
  const hr = box.horizontal.repeat(box.width);
  const padding = Math.max(0, 44 - displayName.length);

  process.stdout.write(`\n${flowColor}${box.topLeft}${hr}${box.topRight}${c.reset}\n`);
  process.stdout.write(
    `${flowColor}${box.vertical}${c.reset} ${c.bold}Flow ${displayName}${c.reset} ${c.dim}started${c.reset}${' '.repeat(padding)}${flowColor}${box.vertical}${c.reset}\n`,
  );
  process.stdout.write(`${flowColor}${box.leftT}${hr}${box.rightT}${c.reset}\n`);
}

function printFlowEnd(flowColor: string): void {
  const hr = box.horizontal.repeat(box.width);
  process.stdout.write(`${flowColor}${box.bottomLeft}${hr}${box.bottomRight}${c.reset}\n`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
