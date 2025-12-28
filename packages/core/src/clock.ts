type Clock = {
  nowEpochMs: () => number;
  nowPerfMs: () => number;
};

function createClock(): Clock {
  const perf = globalThis.performance;
  if (perf && typeof perf.now === 'function') {
    const hasOrigin = typeof perf.timeOrigin === 'number';
    return {
      nowEpochMs: () => (hasOrigin ? perf.timeOrigin + perf.now() : Date.now()),
      nowPerfMs: () => perf.now(),
    };
  }
  const proc = (globalThis as any).process;
  const hasHr =
    proc && typeof proc.hrtime === 'function' && typeof proc.hrtime.bigint === 'function';
  if (hasHr) {
    const epochOriginMs = Date.now();
    const start = proc.hrtime();
    const deltaMs = () => {
      const d = proc.hrtime(start);
      return d[0] * 1000 + d[1] / 1_000_000;
    };
    return {
      nowEpochMs: () => epochOriginMs + deltaMs(),
      nowPerfMs: () => deltaMs(),
    };
  }
  return {
    nowEpochMs: () => Date.now(),
    nowPerfMs: () => Date.now(),
  };
}

export const clock = createClock();
