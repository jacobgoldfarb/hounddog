import {
  clock,
  getConfig,
  getFlowId,
  makeFlowId,
  withFlow,
  mark,
  markAndEndFlow,
} from '@hounddog/core';
import { normalizeUrl, isHoundInternalRequest } from './utils.js';

/**
 * Wrap a fetch function with Hounddog instrumentation.
 *
 * - Propagates flow ID via headers
 * - Emits FE.http.sent and FE.http.end events
 * - Creates a new flow if none exists
 */
export function instrumentFetch(baseFetch: typeof fetch): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = normalizeUrl(input);

    // Skip hound internal requests to avoid infinite recursion
    if (isHoundInternalRequest(url)) {
      return baseFetch(input, init);
    }

    // Use existing flow or create a new one
    const existingFlow = getFlowId();
    if (existingFlow) {
      return executeFetch(baseFetch, input, init);
    }

    const newFlowId = makeFlowId();
    return withFlow(async () => executeFetch(baseFetch, input, init), newFlowId);
  };
}

/**
 * Execute fetch with event emission.
 */
async function executeFetch(
  baseFetch: typeof fetch,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const cfg = getConfig();
  const url = normalizeUrl(input);
  const startPerf = clock.nowPerfMs();
  const flowId = getFlowId();

  // Inject flow ID header
  const headers = new Headers(
    init?.headers || (input instanceof Request ? input.headers : undefined) || {},
  );
  if (flowId) {
    headers.set(cfg.propagationHeader, flowId);
  }

  const instrumentedInit: RequestInit = { ...init, headers };

  try {
    await mark('http.sent', { attrs: { url } });

    const response = await baseFetch(input as RequestInfo, instrumentedInit);

    await markAndEndFlow('http.response', {
      attrs: { url },
      status: response.status,
      durationMs: clock.nowPerfMs() - startPerf,
    });

    return response;
  } catch (error) {
    await markAndEndFlow('http.response', {
      attrs: { url },
      status: 'error',
      durationMs: clock.nowPerfMs() - startPerf,
    });
    throw error;
  }
}
