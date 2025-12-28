import { describe, it, expect } from 'vitest';
import { withFlow, getFlowId, makeFlowId } from '../src/context';

describe('context', () => {
  it('sets and clears flow id', () => {
    expect(getFlowId()).toBeUndefined();
    const flowId = makeFlowId();
    const inside = withFlow(flowId, () => getFlowId());
    expect(inside).toBe(flowId);
    expect(getFlowId()).toBeUndefined();
  });

  it('cleans up on error', () => {
    const flowId = makeFlowId();
    try {
      withFlow(flowId, () => {
        throw new Error('boom');
      });
    } catch {
      // ignore
    }
    expect(getFlowId()).toBeUndefined();
  });
});
