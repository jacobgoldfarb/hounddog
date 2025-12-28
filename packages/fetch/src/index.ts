import { getConfig } from '@hounddog/core';
import { getFlowId, mark } from '@hounddog/core';

function normalizeUrl(input: RequestInfo | URL): string {
  const cfg = getConfig();
  const url = typeof input === 'string'
    ? new URL(input, (globalThis as any).location?.origin || 'http://localhost')
    : input instanceof URL
      ? input
      : new URL((input as Request).url);
  return url.toString();
}

export function houndFetch(baseFetch: typeof fetch): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const cfg = getConfig();
    const urlString = normalizeUrl(input);
    const start = Date.now();
    const flowId = getFlowId();

    const headers = new Headers(
      (init && init.headers) ||
        (input instanceof Request ? input.headers : undefined) ||
        {},
    );
    if (flowId) {
      headers.set(cfg.propagationHeader, flowId);
    }
    const nextInit: RequestInit = { ...(init || {}), headers };

    await mark('FE.http.start', { url: urlString });
    try {
      const res = await baseFetch(input as any, nextInit);
      await mark('FE.http.end', {
        url: urlString,
        status: (res as Response).status,
        durationMs: Date.now() - start,
      });
      return res;
    } catch (err) {
      await mark('FE.http.end', {
        url: urlString,
        status: 'error',
        durationMs: Date.now() - start,
      });
      throw err;
    }
  };
}

export function patchFetch(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).fetch = houndFetch(globalThis.fetch.bind(globalThis));
}

