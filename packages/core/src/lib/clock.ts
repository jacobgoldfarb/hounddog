/**
 * Clock interface for timing operations.
 */
export interface Clock {
  /** Wall-clock time in epoch milliseconds. */
  nowEpochMs: () => number;
  /** Monotonic time in milliseconds (for accurate durations). */
  nowPerfMs: () => number;
}

/**
 * Create a clock instance appropriate for the current runtime.
 * Uses performance.now() when available, falls back to Date.now().
 */
function createClock(): Clock {
  // Browser or modern Node with performance API
  const perf = globalThis.performance;
  if (perf && typeof perf.now === 'function') {
    const hasOrigin = typeof perf.timeOrigin === 'number';
    return {
      nowEpochMs: () => (hasOrigin ? perf.timeOrigin + perf.now() : Date.now()),
      nowPerfMs: () => perf.now(),
    };
  }

  // Node.js with process.hrtime
  const proc = (globalThis as any).process;
  const hasHrtime =
    proc && typeof proc.hrtime === 'function' && typeof proc.hrtime.bigint === 'function';

  if (hasHrtime) {
    const epochOriginMs = Date.now();
    const start = proc.hrtime();
    const deltaMs = (): number => {
      const d = proc.hrtime(start);
      return d[0] * 1000 + d[1] / 1_000_000;
    };
    return {
      nowEpochMs: () => epochOriginMs + deltaMs(),
      nowPerfMs: () => deltaMs(),
    };
  }

  // Fallback: Date.now() for both
  return {
    nowEpochMs: () => Date.now(),
    nowPerfMs: () => Date.now(),
  };
}

/**
 * Global clock instance.
 */
export const clock = createClock();
