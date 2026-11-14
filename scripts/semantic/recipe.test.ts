import { describe, expect, it } from 'vitest';
import type { VerseKey } from '../../src/data/types';
import { applyRecipe, describeRecipe, PLAIN } from './recipe';

const keys: VerseKey[] = ['1:1', '1:2'];
const vectors = [Float32Array.from([1, 0]), Float32Array.from([0, 1])];
const ints = (bin: Uint8Array) => [...new Int8Array(bin.buffer, bin.byteOffset, bin.byteLength)];

describe('applyRecipe', () => {
  it('packs the vectors unchanged with the plain recipe', () => {
    const { bin, meta } = applyRecipe('m', keys, vectors, [20, 20], PLAIN);
    expect(meta.keys).toEqual(keys);
    expect(ints(bin)).toEqual([127, 0, 0, 127]);
  });

  it('mixes in neighbours with the short self weight for short verses only', () => {
    const r = { ...PLAIN, self: 1, shortSelf: 0.5 };
    const { bin } = applyRecipe('m', keys, vectors, [20, 3], r);
    // 1:1 is long: unchanged. 1:2 is short: (0.5, 0.5) normalized.
    expect(ints(bin)).toEqual([127, 0, 90, 90]);
  });

  it('shortens the rows of short verses', () => {
    const r = { ...PLAIN, shortWords: 4, lengthPower: 1 };
    const { bin } = applyRecipe('m', keys, vectors, [4, 2], r);
    expect(ints(bin)).toEqual([127, 0, 0, 64]);
  });
});

describe('describeRecipe', () => {
  it('names the plain recipe and the changed settings', () => {
    expect(describeRecipe(PLAIN)).toBe('plain');
    expect(describeRecipe({ self: 0.8, shortSelf: 0.5, shortWords: 10, lengthPower: 0.3 })).toBe(
      'self 0.8/0.5 pow 0.3 <10w',
    );
  });
});
