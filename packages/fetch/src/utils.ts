export function normalizeUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    try {
      const base = (globalThis as any).location?.origin as string | undefined;
      const u = new URL(input, base);
      u.search = '';
      return u.toString();
    } catch {
      return input.split('?')[0] ?? input;
    }
  }
  if (input instanceof URL) {
    const u = new URL(input.toString());
    u.search = '';
    return u.toString();
  }
  const req = input as Request;
  try {
    const base = (globalThis as any).location?.origin as string | undefined;
    const u = new URL(req.url, base);
    u.search = '';
    return u.toString();
  } catch {
    return req.url.split('?')[0] ?? req.url;
  }
}
