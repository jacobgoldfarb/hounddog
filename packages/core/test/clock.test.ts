import { describe, it, expect } from 'vitest';
import { clock } from '../src/clock';

describe('clock', () => {
  it('provides epoch ms and monotonic ms', async () => {
    const t0e = clock.nowEpochMs();
    const t0p = clock.nowPerfMs();

    await new Promise((r) => setTimeout(r, 10));

    const t1e = clock.nowEpochMs();
    const t1p = clock.nowPerfMs();

    expect(t1e).toBeGreaterThanOrEqual(t0e);
    expect(t1p).toBeGreaterThan(t0p);
  });
});
