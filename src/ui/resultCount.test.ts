import { describe, expect, it } from 'vitest';
import { resultCount } from './resultCount';

describe('resultCount', () => {
  it('shows "8 of N roots" while the list shows only the top roots', () => {
    expect(resultCount({ mode: 'roots', shown: 8, total: 22 })).toEqual({ value: '8 of 22', unit: 'roots' });
  });

  it('shows the total when every root is in the list', () => {
    expect(resultCount({ mode: 'roots', shown: 5, total: 5 })).toEqual({ value: '5', unit: 'roots' });
    expect(resultCount({ mode: 'roots', shown: 1, total: 1 })).toEqual({ value: '1', unit: 'root' });
  });

  it('shows "30+ verses" when the verse list is capped, else the number', () => {
    expect(resultCount({ mode: 'verses', shown: 30, total: 30, capped: true })).toEqual({ value: '30+', unit: 'verses' });
    expect(resultCount({ mode: 'verses', shown: 12, total: 12 })).toEqual({ value: '12', unit: 'verses' });
    expect(resultCount({ mode: 'verses', shown: 1, total: 1 })).toEqual({ value: '1', unit: 'verse' });
  });

  it('shows nothing without results', () => {
    expect(resultCount({ mode: 'roots', shown: 0, total: 0 })).toBeNull();
    expect(resultCount({ mode: 'verses', shown: 0, total: 0 })).toBeNull();
  });

  it('writes big numbers with separators', () => {
    expect(resultCount({ mode: 'roots', shown: 8, total: 1234 })).toEqual({ value: '8 of 1,234', unit: 'roots' });
  });
});
