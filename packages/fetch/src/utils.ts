/**
 * Internal tailchi request path prefix.
 */
const HOUND_INTERNAL_PREFIX = '/__hound/';

/**
 * Check if a URL is a tailchi internal request (should not be instrumented).
 */
export function isHoundInternalRequest(url: string): boolean {
  return url.includes(HOUND_INTERNAL_PREFIX);
}

/**
 * Normalize a fetch input to a URL string (without query params).
 * Used for logging and flow identification.
 */
export function normalizeUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return parseAndStripQuery(input);
  }

  if (input instanceof URL) {
    const copy = new URL(input.toString());
    copy.search = '';
    return copy.toString();
  }

  // Request object
  return parseAndStripQuery((input as Request).url);
}

/**
 * Parse URL string and strip query parameters.
 */
function parseAndStripQuery(urlString: string): string {
  try {
    const base = (globalThis as any).location?.origin as string | undefined;
    const url = new URL(urlString, base);
    url.search = '';
    return url.toString();
  } catch {
    // Fallback: simple string split
    return urlString.split('?')[0] ?? urlString;
  }
}
