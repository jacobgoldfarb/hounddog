import { readEvents } from '../lib/events.js';
import { getFlagValue, type ParsedArgs } from '../lib/args.js';
import { assembleFlows, formatFlow } from '../index.js';

/**
 * Run a flows subcommand (last, show, search).
 */
export async function runFlows(args: ParsedArgs): Promise<void> {
  const { subcommand, positional, filePath } = args;

  const events = await readEvents(filePath);
  const flows = assembleFlows(events);

  switch (subcommand) {
    case 'last':
      return flowsLast(args, flows);
    case 'show':
      return flowsShow(positional[0], flows);
    case 'search':
      return flowsSearch(args, flows);
    default:
      console.error(`Unknown flows subcommand: ${subcommand}`);
      process.exitCode = 1;
  }
}

type Flow = ReturnType<typeof assembleFlows>[number];

function flowsLast(args: ParsedArgs, flows: Flow[]): void {
  const nRaw = getFlagValue(args, '-n');
  const n = nRaw ? Number(nRaw) : 5;
  const count = isNaN(n) ? 5 : n;
  const latest = flows.slice(0, count);

  for (const flow of latest) {
    process.stdout.write(formatFlow(flow));
  }
}

function flowsShow(flowId: string | undefined, flows: Flow[]): void {
  if (!flowId) {
    console.error('Usage: tailchi flows show <flowId>');
    process.exitCode = 1;
    return;
  }

  const target = flows.find((f) => f.flowId === flowId);
  if (!target) {
    console.log('Flow not found');
    return;
  }

  process.stdout.write(formatFlow(target));
}

function flowsSearch(args: ParsedArgs, flows: Flow[]): void {
  const marker = getFlagValue(args, '--marker');
  if (!marker) {
    console.error('Usage: tailchi flows search --marker <name>');
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
    console.log('No matches found');
    return;
  }

  for (const flow of matched) {
    const header = `┌─ Flow ${flow.flowId} (matches: ${flow.lines.length})\n`;
    const lines = flow.lines
      .map((l) => `│ ${l.type} @ ${new Date(l.timestampMs).toISOString()}\n`)
      .join('');
    const footer = `└─\n`;
    process.stdout.write(header + lines + footer);
  }
}

