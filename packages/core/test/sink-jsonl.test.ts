import { describe, it, expect } from 'vitest';
import { readFile, stat, readdir, rm, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { configureHounddog } from '../src/config';
import { mark, run } from '../src/api';
import { flushSink, closeSink } from '../src/sink/index';

async function readLines(file: string): Promise<string[]> {
  try {
    const buf = await readFile(file, 'utf8');
    return buf.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function uniquePath(): string {
  const base = `.hounddog/test-events-${Math.random().toString(36).slice(2)}.jsonl`;
  return base;
}

describe('JSONL sink', () => {
  it('writes events for run + mark and flushes to disk', async () => {
    const filePath = uniquePath();
    await mkdir(dirname(filePath), { recursive: true });
    configureHounddog({
      sink: {
        kind: 'jsonl',
        filePath,
        rotateBytes: 5_000_000,
        retainFiles: 1,
        batchMax: 16,
        flushIntervalMs: 0,
      },
    });
    await run('test.flow', async () => {
      await mark('test.mark', { foo: 'bar' });
    });
    await flushSink();
    const lines = await readLines(filePath);
    expect(lines.length).toBe(3); // start, mark, end
    const events = lines.map((l) => JSON.parse(l));
    expect(events[0].type.endsWith('.start')).toBe(true);
    expect(events[1].type).toBe('test.mark');
    expect(events[2].type.endsWith('.end')).toBe(true);
    await closeSink();
    await rm(filePath, { force: true });
  });

  it('rotates when file exceeds size and enforces retention', async () => {
    const filePath = uniquePath();
    const dir = dirname(filePath);
    await mkdir(dir, { recursive: true });
    configureHounddog({
      sink: {
        kind: 'jsonl',
        filePath,
        rotateBytes: 400, // small to force rotation
        retainFiles: 2,
        batchMax: 1,
        flushIntervalMs: 0,
      },
    });
    // Emit enough events to exceed rotation threshold multiple times
    for (let i = 0; i < 20; i++) {
      await run('rotate.flow', async () => {
        await mark('rotate.mark', { i });
      });
      await flushSink();
    }
    const files = await readdir(dir);
    const base = filePath.split('/').slice(-1)[0];
    const rotated = files.filter((f: string) => f.startsWith(base + '.'));
    // retainFiles=2 keeps 2 rotated plus active file
    expect(rotated.length).toBeLessThanOrEqual(2);
    // active file exists
    await stat(filePath);
    await closeSink();
    // cleanup
    await Promise.all(rotated.map((f: string) => rm(join(dir, f), { force: true })));
    await rm(filePath, { force: true });
  });

  it('close stops further writes', async () => {
    const filePath = uniquePath();
    await mkdir(dirname(filePath), { recursive: true });
    configureHounddog({
      sink: {
        kind: 'jsonl',
        filePath,
        rotateBytes: 5_000_000,
        retainFiles: 1,
        batchMax: 16,
        flushIntervalMs: 0,
      },
    });
    await run('close.flow', async () => {
      await mark('before.close');
    });
    await flushSink();
    await closeSink();
    // Emits after close should no-op
    await mark('after.close');
    await flushSink();
    const lines = await readLines(filePath);
    const events = lines.map((l) => JSON.parse(l));
    expect(events.some((e) => e.type === 'after.close')).toBe(false);
    await rm(filePath, { force: true });
  });
});
