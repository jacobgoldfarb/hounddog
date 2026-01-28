import { readFile } from 'node:fs/promises';

/**
 * A single event line from the JSONL log.
 */
export interface EventLine {
  flowId: string;
  flowLabel?: string;
  type: string;
  timestampMs: number;
  service: string;
  componentTag?: string;
  durationMs?: number;
  status?: string | number;
  attrs?: Record<string, unknown>;
  flowTerminal?: boolean;
}

/**
 * Read all events from a JSONL file.
 */
export async function readEvents(filePath: string): Promise<EventLine[]> {
  try {
    const buf = await readFile(filePath, 'utf8');
    const lines = buf.split('\n').filter(Boolean);
    const out: EventLine[] = [];
    for (const line of lines) {
      try {
        out.push(JSON.parse(line));
      } catch {
        // Skip malformed lines
      }
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Parse a single JSON line into an event.
 */
export function parseEventLine(line: string): EventLine | null {
  try {
    return JSON.parse(line) as EventLine;
  } catch {
    return null;
  }
}
