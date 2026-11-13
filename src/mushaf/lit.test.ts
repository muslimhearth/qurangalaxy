import { describe, expect, it } from 'vitest';
import type { Occurrence } from '../data/types';
import { LIT_A, LIT_B, LIT_BOTH, LIT_NONE, litStates } from './lit';

const occ = (...keys: string[]): Occurrence[] => keys.map((v) => ({ v: v as Occurrence['v'], w: [1] }));

describe('litStates', () => {
  it('marks nothing without roots', () => {
    const lit = litStates(undefined, undefined);
    expect(lit).toHaveLength(6236);
    expect(lit.every((s) => s === LIT_NONE)).toBe(true);
  });

  it('marks verses of root A, root B and both', () => {
    const lit = litStates(occ('1:1', '2:1', '2:255'), occ('2:255', '114:6'));
    expect(lit[0]).toBe(LIT_A);
    expect(lit[7]).toBe(LIT_A);
    expect(lit[7 + 254]).toBe(LIT_BOTH);
    expect(lit[6235]).toBe(LIT_B);
    expect(lit[1]).toBe(LIT_NONE);
    expect(lit.filter((s) => s !== LIT_NONE)).toHaveLength(4);
  });

  it('ignores unknown verse keys', () => {
    expect(litStates(occ('200:1'), undefined).every((s) => s === LIT_NONE)).toBe(true);
  });
});
