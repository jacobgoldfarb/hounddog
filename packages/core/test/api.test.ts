import { describe, it, expect } from 'vitest';
import { mark, run } from '../src/api';
import { getFlowId } from '../src/context';

describe('api', () => {
  it('run creates a flow and tears it down', async () => {
    let seenInside: string | undefined;
    await run('test.flow', async () => {
      seenInside = getFlowId();
    });
    expect(typeof seenInside).toBe('string');
    expect(getFlowId()).toBeUndefined();
  });

  it('mark without flow does not throw', async () => {
    await mark('test.mark');
  });

  it('mark within run uses active flow', async () => {
    let flowInside: string | undefined;
    await run('test.flow', async () => {
      flowInside = getFlowId();
      await mark('test.mark');
    });
    expect(typeof flowInside).toBe('string');
  });
});
