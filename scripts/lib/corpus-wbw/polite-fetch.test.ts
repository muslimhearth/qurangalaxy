import { describe, expect, it } from 'vitest';
import { createPoliteFetcher, isAllowedByRobots } from './polite-fetch';

/** Fake clock: `sleep` only moves time forward. */
function fakeClock() {
  let now = 0;
  const sleeps: number[] = [];
  return {
    now: () => now,
    sleep: async (ms: number) => {
      sleeps.push(ms);
      now += ms;
    },
    advance: (ms: number) => (now += ms),
    sleeps,
  };
}

describe('createPoliteFetcher', () => {
  it('waits so that requests start at least the interval apart', async () => {
    const clock = fakeClock();
    const starts: number[] = [];
    const fetcher = createPoliteFetcher({
      intervalMs: 1000,
      clock,
      get: async () => {
        starts.push(clock.now());
        clock.advance(200);
        return 'ok';
      },
    });
    await fetcher('a');
    await fetcher('b');
    await fetcher('c');
    expect(starts).toEqual([0, 1000, 2000]);
  });

  it('retries with growing backoff and then succeeds', async () => {
    const clock = fakeClock();
    let calls = 0;
    const fetcher = createPoliteFetcher({
      intervalMs: 1000,
      backoffMs: 5000,
      clock,
      get: async () => {
        calls++;
        if (calls < 3) throw new Error('boom');
        return 'ok';
      },
    });
    expect(await fetcher('a')).toBe('ok');
    expect(calls).toBe(3);
    expect(clock.sleeps.filter((ms) => ms >= 5000)).toEqual([5000, 10000]);
  });

  it('gives up after the retry limit', async () => {
    const clock = fakeClock();
    const fetcher = createPoliteFetcher({
      intervalMs: 1000,
      retries: 2,
      clock,
      get: async () => {
        throw new Error('down');
      },
    });
    await expect(fetcher('a')).rejects.toThrow(/down/);
  });
});

describe('isAllowedByRobots', () => {
  const robots = 'User-agent: *\nDisallow: /search.jsp\n\nUser-agent: BadBot\nDisallow: /\n';

  it('allows paths not disallowed for all agents', () => {
    expect(isAllowedByRobots(robots, '/wordbyword.jsp')).toBe(true);
  });

  it('blocks disallowed prefixes', () => {
    expect(isAllowedByRobots(robots, '/search.jsp?q=1')).toBe(false);
  });

  it('blocks everything under Disallow: /', () => {
    expect(isAllowedByRobots('User-agent: *\nDisallow: /', '/wordbyword.jsp')).toBe(false);
  });

  it('treats an empty Disallow as allow-all', () => {
    expect(isAllowedByRobots('User-agent: *\nDisallow:', '/wordbyword.jsp')).toBe(true);
  });

  it('allows everything when there is no robots file', () => {
    expect(isAllowedByRobots(undefined, '/wordbyword.jsp')).toBe(true);
  });
});
