#!/usr/bin/env node
import { parseArgs, hasFlag } from './lib/args.js';
import { runHelp } from './commands/help.js';
import { runFlows } from './commands/flows.js';
import { runTail } from './commands/tail.js';

async function main(): Promise<void> {
  const args = parseArgs();

  // Help takes priority
  if (args.command === 'help' || hasFlag(args, '--help') || hasFlag(args, '-h')) {
    runHelp();
    return;
  }

  // Route to command
  switch (args.command) {
    case 'flows':
      await runFlows(args);
      break;
    case 'tail':
      await runTail(args);
      break;
    default:
      console.error(`Unknown command: ${args.command}`);
      console.error('Run "tailchi help" for usage');
      process.exitCode = 1;
  }
}

void main();
