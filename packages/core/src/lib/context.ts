/**
 * Flow context entry.
 */
interface FlowContext {
  id: string;
  label?: string;
}

/**
 * Flow context stack.
 * Tracks active flows across sync and async execution.
 */
let flowStack: FlowContext[] = [];

/**
 * Options for withFlow.
 */
export interface WithFlowOptions {
  /** Unique flow identifier (auto-generated if not provided). */
  id?: string;
  /** Human-readable label for display (defaults to id). */
  label?: string;
}

/**
 * Execute a function within a flow context.
 *
 * @param fn - Function to execute
 * @param options - Flow ID and/or label, or just a string for backwards compat
 */
export function withFlow<T>(fn: () => T, options?: WithFlowOptions | string): T {
  const ctx = normalizeFlowOptions(options);
  flowStack.push(ctx);

  let isSync = true;
  try {
    const result = fn();

    // Handle async functions
    if (result && typeof (result as any).then === 'function') {
      isSync = false;
      return (result as any).finally(() => {
        flowStack.pop();
      });
    }

    return result;
  } catch (err) {
    flowStack.pop();
    throw err;
  } finally {
    if (isSync) {
      flowStack.pop();
    }
  }
}

/**
 * Get the current flow ID.
 */
export function getFlowId(): string | undefined {
  const ctx = flowStack[flowStack.length - 1];
  return ctx?.id;
}

/**
 * Get the current flow label (falls back to ID).
 */
export function getFlowLabel(): string | undefined {
  const ctx = flowStack[flowStack.length - 1];
  return ctx?.label ?? ctx?.id;
}

/**
 * Get the current flow context.
 */
export function getFlowContext(): FlowContext | undefined {
  return flowStack[flowStack.length - 1];
}

/**
 * Generate a new unique flow ID.
 */
export function makeFlowId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${ts}-${rand}`;
}

/**
 * Normalize options to FlowContext.
 */
function normalizeFlowOptions(options?: WithFlowOptions | string): FlowContext {
  if (!options) {
    const id = makeFlowId();
    return { id };
  }

  if (typeof options === 'string') {
    // String can be either an ID (looks like uuid) or a label
    // If it contains a dash and looks like our format, treat as ID
    // Otherwise treat as label
    if (options.includes('-') && /^[a-z0-9]+-[a-z0-9]+$/.test(options)) {
      return { id: options };
    }
    // User-provided string is a label, generate ID
    const id = makeFlowId();
    return { id, label: options };
  }

  // Full options object
  const id = options.id ?? makeFlowId();
  return { id, label: options.label };
}
