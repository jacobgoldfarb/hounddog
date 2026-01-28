import { resolve } from 'node:path';

/**
 * Parsed CLI arguments.
 */
export interface ParsedArgs {
  command: string;
  subcommand?: string;
  positional: string[];
  flags: Map<string, string | true>;
  filePath: string;
}

/**
 * Parse process.argv into a structured format.
 */
export function parseArgs(argv: string[] = process.argv): ParsedArgs {
  const args = argv.slice(2);
  const command = args[0] || 'help';
  const flags = new Map<string, string | true>();
  const positional: string[] = [];
  let subcommand: string | undefined;

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;

    if (arg.startsWith('--')) {
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        flags.set(arg, next);
        i++;
      } else {
        flags.set(arg, true);
      }
    } else if (arg.startsWith('-')) {
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        flags.set(arg, next);
        i++;
      } else {
        flags.set(arg, true);
      }
    } else if (!subcommand && command === 'flows') {
      subcommand = arg;
    } else {
      positional.push(arg);
    }
  }

  // Resolve file path from --path flag or env or default
  const pathArg = flags.get('--path');
  const sinkPath =
    (typeof pathArg === 'string' ? pathArg : undefined) ||
    process.env.HOUNDDOG_SINK_PATH ||
    '.tailchi/events.jsonl';
  const filePath = resolve(process.cwd(), sinkPath);

  return { command, subcommand, positional, flags, filePath };
}

/**
 * Check if a flag is present.
 */
export function hasFlag(args: ParsedArgs, flag: string): boolean {
  return args.flags.has(flag);
}

/**
 * Get a flag value as string.
 */
export function getFlagValue(args: ParsedArgs, flag: string): string | undefined {
  const val = args.flags.get(flag);
  return typeof val === 'string' ? val : undefined;
}
