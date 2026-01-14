/**
 * Flow context stack.
 * Tracks active flow IDs across sync and async execution.
 */
let flowIdStack: string[] = [];

/**
 * Execute a function within a flow context.
 * The flow ID is available via getFlowId() during execution.
 *
 * Handles both sync and async functions:
 * - Sync: pops flow ID after function returns
 * - Async: pops flow ID after promise settles
 */
export function withFlow<T>(fn: () => T, flowId?: string): T {
  flowIdStack.push(flowId || makeFlowId());

  let isSync = true;
  try {
    const result = fn();

    // Handle async functions
    if (result && typeof (result as any).then === 'function') {
      isSync = false;
      return (result as any).finally(() => {
        flowIdStack.pop();
      });
    }

    return result;
  } catch (err) {
    flowIdStack.pop();
    throw err;
  } finally {
    if (isSync) {
      flowIdStack.pop();
    }
  }
}

/**
 * Get the current flow ID, if any.
 */
export function getFlowId(): string | undefined {
  return flowIdStack[flowIdStack.length - 1];
}

/**
 * Generate a new unique flow ID.
 */
export function makeFlowId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${ts}-${rand}`;
}
