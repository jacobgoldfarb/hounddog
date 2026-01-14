import { stat, open } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { c } from '../lib/colors.js';
import { parseEventLine, type EventLine } from '../lib/events.js';
import { formatEventLine, getFlowColor, shortFlowId, box } from '../format/event.js';
import { hasFlag, type ParsedArgs } from '../lib/args.js';

/**
 * Per-flow state for delta calculations.
 */
interface FlowState {
  lastTsByService: Map<string, number>;
  eventCount: number;
}

/**
 * Tail options.
 */
interface TailOptions {
  fromStart: boolean;
}

/**
 * Run the tail command - stream events in real-time.
 */
export async function runTail(args: ParsedArgs): Promise<void> {
  const options: TailOptions = {
    fromStart: hasFlag(args, '--from-start'),
  };
  await streamEvents(args.filePath, options);
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
    } catch {
      if (!warnedMissing) {
        process.stdout.write(`${c.dim}waiting for ${filePath}...${c.reset}\n`);
        warnedMissing = true;
      }
    }

    await sleep(intervalMs);
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

  // Track flow order
  if (isNewFlow) {
    recentFlows.unshift(evt.flowId);
    if (recentFlows.length > 10) recentFlows.pop();
  }

  // Compute delta (only within same service to avoid clock skew)
  const lastTsForService = state.lastTsByService.get(evt.service);
  const delta =
    lastTsForService !== undefined
      ? Math.max(0, Math.round(evt.timestampMs - lastTsForService))
      : null;
  state.lastTsByService.set(evt.service, evt.timestampMs);
  state.eventCount++;
  flowStates.set(evt.flowId, state);

  const flowColor = getFlowColor(evt.flowId);

  // Print flow header for new flows
  if (isNewFlow) {
    printFlowStart(evt.flowId, flowColor);
  }

  // Print event line
  process.stdout.write(formatEventLine(evt, { flowColor, delta }));

  // Print flow footer for terminal events
  if (evt.flowTerminal) {
    printFlowEnd(flowColor);
  }
}

function printFlowStart(flowId: string, flowColor: string): void {
  const hr = box.horizontal.repeat(box.width);
  process.stdout.write(`\n${flowColor}${box.topLeft}${hr}${box.topRight}${c.reset}\n`);
  process.stdout.write(
    `${flowColor}${box.vertical}${c.reset} ${c.bold}Flow ${shortFlowId(flowId)}${c.reset} ${c.dim}started${c.reset}${' '.repeat(36)}${flowColor}${box.vertical}${c.reset}\n`,
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
