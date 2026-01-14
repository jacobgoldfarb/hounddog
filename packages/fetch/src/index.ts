import { clock, getConfig } from '@hounddog/core';
import { getFlowId, makeFlowId, withFlow, mark } from '@hounddog/core';
import { normalizeUrl } from './utils.js';

export function houndFetch(baseFetch: typeof fetch): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = normalizeUrl(input);
    // Skip hound internal requests to avoid infinite recursion
    if (url.includes('/__hound/')) {
      return baseFetch(input, init);
    }

    const existingFlow = getFlowId();
    if (existingFlow) {
      return await doFetchWithMarks(baseFetch, input, init);
    }
    const newFlowId = makeFlowId();
    return await withFlow(newFlowId, async () => {
      return await doFetchWithMarks(baseFetch, input, init);
    });
  };
}

export function enableHoundFetch(
  options: {
    baseFetch?: typeof fetch;
    shouldPatchGlobal?: boolean;
  } = {
    shouldPatchGlobal: true,
  },
): typeof fetch {
  const base = options?.baseFetch ?? (globalThis as any).fetch?.bind(globalThis);
  if (!base) {
    throw new Error('globalThis.fetch is not available; provide baseFetch');
  }
  const instrumented = houndFetch(base);
  if (options?.shouldPatchGlobal !== false) {
    (globalThis as any).fetch = instrumented;
  }
  return instrumented;
}

async function doFetchWithMarks(
  baseFetch: typeof fetch,
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  const cfg = getConfig();
  const url = normalizeUrl(input);
  const startPerf = clock.nowPerfMs();
  const flowId = getFlowId();

  const headers = new Headers(
    (init && init.headers) || (input instanceof Request ? input.headers : undefined) || {},
  );
  if (flowId) {
    headers.set(cfg.propagationHeader, flowId);
  }
  const nextInit: RequestInit = { ...(init || {}), headers };

  await mark('FE.http.start', { url });
  try {
    const res = await baseFetch(input as any, nextInit);
    await mark('FE.http.end', {
      url,
      status: (res as Response).status,
      durationMs: clock.nowPerfMs() - startPerf,
    });
    return res;
  } catch (err) {
    await mark('FE.http.end', {
      url,
      status: 'error',
      durationMs: clock.nowPerfMs() - startPerf,
    });
    throw err;
  }
}
