import { mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { appendFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { getConfig } from '../config';
import type { HoundEvent } from '../types';
import type { Sink } from './types';

function toLine(event: HoundEvent): string {
  return JSON.stringify(event) + '\n';
}

export class JsonlSink implements Sink {
  private filePath: string;
  private rotateBytes: number;
  private retainFiles: number;
  private batchMax: number;
  private flushIntervalMs: number;
  private buffer: string[] = [];
  private flushing = false;
  private closed = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private estimatedSize = 0;

  constructor() {
    const cfg = getConfig();
    const sink = cfg.sink!;
    this.filePath = sink.filePath;
    this.rotateBytes = sink.rotateBytes ?? 5000000;
    this.retainFiles = sink.retainFiles ?? 3;
    this.batchMax = sink.batchMax ?? 64;
    this.flushIntervalMs = sink.flushIntervalMs ?? 250;
    mkdirSync(dirname(this.filePath), { recursive: true });
    try {
      const st = statSync(this.filePath);
      this.estimatedSize = st.size;
    } catch {
      void writeFile(this.filePath, '', { flag: 'a' });
      this.estimatedSize = 0;
    }
    if (this.flushIntervalMs > 0) {
      this.timer = setInterval(() => {
        void this.flush();
      }, this.flushIntervalMs) as unknown as ReturnType<typeof setInterval>;
    }
  }

  async emit(event: HoundEvent): Promise<void> {
    if (this.closed) return;
    this.buffer.push(toLine(event));
    if (this.buffer.length >= this.batchMax) {
      await this.flush();
    }
  }

  private async rotateIfNeeded(nextChunkBytes: number): Promise<void> {
    if (this.rotateBytes <= 0) return;
    if (this.estimatedSize + nextChunkBytes <= this.rotateBytes) return;
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const rotated = `${this.filePath}.${ts}`;
    try {
      await rename(this.filePath, rotated);
    } catch {
      // ignore rotation failure in dev
    }
    await writeFile(this.filePath, '', { flag: 'w' });
    this.estimatedSize = 0;
    this.enforceRetention();
  }

  private enforceRetention(): void {
    if (this.retainFiles <= 0) return;
    const dir = dirname(this.filePath);
    const base = this.filePath.split('/').slice(-1)[0];
    const rotated = readdirSync(dir)
      .filter((f: any) => f.startsWith(base + '.'))
      .map((f: any) => ({ f, t: statSync(join(dir, f)).mtimeMs }))
      .sort((a: any, b: any) => b.t - a.t);
    for (let i = this.retainFiles - 1; i < rotated.length; i++) {
      try {
        unlinkSync(join(dir, rotated[i].f));
      } catch {
        // ignore
      }
    }
  }

  async flush(): Promise<void> {
    if (this.flushing || this.buffer.length === 0) return;
    this.flushing = true;
    try {
      const chunk = this.buffer.join('');
      this.buffer = [];
      const bytes = Buffer.byteLength(chunk);
      await this.rotateIfNeeded(bytes);
      await appendFile(this.filePath, chunk, 'utf8');
      this.estimatedSize += bytes;
    } finally {
      this.flushing = false;
    }
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.flush();
  }
}
