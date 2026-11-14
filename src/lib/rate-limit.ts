/** Simple in-isolate sliding window. Best-effort across Cloudflare Workers isolates. */

const hits = new Map<string, number[]>();

/**
 * @returns true if the action is allowed, false if the caller should back off.
 */
export function takeRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

export const RATE_LIMITED = "Too many requests right now. Please wait a moment and try again.";
