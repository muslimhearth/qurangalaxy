/** Time source and sleep, injectable so tests run without real waiting. */
export interface Clock {
  now(): number;
  sleep(ms: number): Promise<void>;
}

/** Real clock based on `Date.now` and `setTimeout`. */
export const realClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/** Generic User-Agent: no personal name, email or repository URL. */
export const USER_AGENT = 'root-gloss-builder/1.0';

/** Plain GET that fails on a non-2xx status. Uses the generic User-Agent. */
export async function httpGet(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

/** Options of {@link createPoliteFetcher}. */
export interface PoliteOptions {
  /** Minimum time between the starts of two requests. */
  intervalMs: number;
  /** First retry delay; it doubles after each failure. Default 5 s. */
  backoffMs?: number;
  /** Retries per URL before giving up. Default 4. */
  retries?: number;
  /** The real request. Default {@link httpGet}. */
  get?: (url: string) => Promise<string>;
  clock?: Clock;
}

/**
 * Returns a fetch function that is strictly serial (callers must await each call),
 * keeps at least `intervalMs` between request starts and retries failures with exponential backoff.
 */
export function createPoliteFetcher(options: PoliteOptions): (url: string) => Promise<string> {
  const { intervalMs, backoffMs = 5000, retries = 4, get = httpGet, clock = realClock } = options;
  let lastStart = -Infinity;
  const throttledGet = async (url: string) => {
    const wait = lastStart + intervalMs - clock.now();
    if (wait > 0) await clock.sleep(wait);
    lastStart = clock.now();
    return get(url);
  };
  return async (url) => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await throttledGet(url);
      } catch (error) {
        if (attempt >= retries) throw error;
        await clock.sleep(backoffMs * 2 ** attempt);
      }
    }
  };
}

/**
 * Checks a robots.txt for the `User-agent: *` group. Returns false if any of its
 * `Disallow` prefixes matches `path`. A missing robots file allows everything.
 */
export function isAllowedByRobots(robots: string | undefined, path: string): boolean {
  if (robots === undefined) return true;
  let inStarGroup = false;
  let lastWasAgent = false;
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const match = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line);
    if (!match) continue;
    const key = match[1]!.toLowerCase();
    const value = match[2]!.trim();
    if (key === 'user-agent') {
      // Consecutive User-agent lines form one group.
      inStarGroup = (lastWasAgent && inStarGroup) || value === '*';
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (inStarGroup && key === 'disallow' && value !== '' && path.startsWith(value)) return false;
  }
  return true;
}
