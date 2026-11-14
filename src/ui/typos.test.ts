import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TYPOS_KEY, loadTypos, useTypos } from './typos';

describe('typo tolerance setting', () => {
  beforeEach(() => {
    localStorage.clear();
    useTypos.setState({ on: true });
  });
  afterEach(() => vi.restoreAllMocks());

  it('is on unless "false" is saved; blocked storage counts as on', () => {
    expect(TYPOS_KEY).toBe('qrg.typos.v1');
    expect(loadTypos()).toBe(true);
    localStorage.setItem(TYPOS_KEY, 'false');
    expect(loadTypos()).toBe(false);
    localStorage.setItem(TYPOS_KEY, 'true');
    expect(loadTypos()).toBe(true);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadTypos()).toBe(true);
  });

  it('saves a change, and still changes with blocked storage', () => {
    useTypos.getState().setOn(false);
    expect(localStorage.getItem(TYPOS_KEY)).toBe('false');
    expect(useTypos.getState().on).toBe(false);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => useTypos.getState().setOn(true)).not.toThrow();
    expect(useTypos.getState().on).toBe(true);
  });
});
