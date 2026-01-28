import { describe, it, expect } from 'vitest';
import { withFlow, getFlowId, makeFlowId } from '../src/lib/context.js';

describe('context', () => {
  it('sets and clears flow id', () => {
    expect(getFlowId()).toBeUndefined();
    const flowId = makeFlowId();
    const inside = withFlow(() => getFlowId(), flowId);
    expect(inside).toBe(flowId);
    expect(getFlowId()).toBeUndefined();
  });

  it('cleans up on error', () => {
    const flowId = makeFlowId();
    try {
      withFlow(() => {
        throw new Error('boom');
      }, flowId);
    } catch {
      // ignore
    }
    expect(getFlowId()).toBeUndefined();
  });
});
