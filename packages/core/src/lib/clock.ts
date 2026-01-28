export interface Clock {
  nowEpochMs: () => number;
  nowPerfMs: () => number;
}

let clockOffset = 0;

function createClock(): Clock {
  const perf = globalThis.performance;
  if (perf && typeof perf.now === 'function') {
    const hasOrigin = typeof perf.timeOrigin === 'number';
    return {
      nowEpochMs: () => (hasOrigin ? perf.timeOrigin + perf.now() : Date.now()) + clockOffset,
      nowPerfMs: () => perf.now(),
    };
  }

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
      nowEpochMs: () => epochOriginMs + deltaMs() + clockOffset,
      nowPerfMs: () => deltaMs(),
    };
  }

  return {
    nowEpochMs: () => Date.now() + clockOffset,
    nowPerfMs: () => Date.now(),
  };
}

export const clock = createClock();

export async function syncClock(daemonUrl: string): Promise<void> {
  try {
    const localBefore = Date.now();
    const res = await fetch(`${daemonUrl}/clock`);
    const localAfter = Date.now();
    const { epochMs } = await res.json();
    const localMid = (localBefore + localAfter) / 2;
    clockOffset = epochMs - localMid;
  } catch {
    clockOffset = 0;
  }
}
