import { instrumentFetch } from './instrument.js';

/**
 * Enable tailchi instrumentation for fetch requests.
 *
 * Patches globalThis.fetch so all fetch calls are automatically instrumented.
 * Returns the instrumented fetch function.
 *
 * @example
 * ```ts
 * import { enableHoundFetch } from '@hounddog/fetch';
 *
 * enableHoundFetch();
 *
 * // All fetch calls are now instrumented
 * await fetch('/api/data');
 * ```
 */
export function enableHoundFetch(): typeof fetch {
  const base = (globalThis as any).fetch?.bind(globalThis);
  if (!base) {
    throw new Error('globalThis.fetch is not available');
  }

  const instrumented = instrumentFetch(base);
  (globalThis as any).fetch = instrumented;

  return instrumented;
}
