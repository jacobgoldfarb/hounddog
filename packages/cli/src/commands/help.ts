import { c } from '../lib/colors.js';

/**
 * Print help message and exit.
 */
export function runHelp(): void {
  const lines = [
    `${c.bold}${c.cyan}🐕 tailchi${c.reset} - request lifecycle tracer`,
    '',
    `${c.dim}Commands:${c.reset}`,
    `  ${c.yellow}tail${c.reset}, ${c.yellow}-f${c.reset}               Stream events in real-time`,
    `  ${c.yellow}flows last${c.reset} [-n N]        Show last N flows`,
    `  ${c.yellow}flows show${c.reset} <flowId>      Show specific flow`,
    `  ${c.yellow}flows search${c.reset} --marker X  Search for marker`,
    '',
    `${c.dim}Options:${c.reset}`,
    `  --path FILE              Log file path (default: .tailchi/events.jsonl)`,
    `  --from-start             Start from beginning of file (tail only)`,
    '',
  ];
  console.log(lines.join('\n'));
}
