let flowIdStack: string[] = [];

export function withFlow<WrappedFnReturnType>(
  flowId: string,
  fn: () => WrappedFnReturnType,
): WrappedFnReturnType {
  flowIdStack.push(flowId);
  let isSync = true;
  try {
    const result = fn();
    // Defer pop until promise settles for async functions
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

export function getFlowId(): string | undefined {
  return flowIdStack[flowIdStack.length - 1];
}

export function makeFlowId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${ts}-${rand}`;
}
