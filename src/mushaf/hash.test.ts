import { describe, expect, it } from 'vitest';
import { joinLayoutHash, splitLayoutHash } from './hash';

const RHM = '#/root/' + encodeURIComponent('رحم');

describe('layout hash', () => {
  it('reads the Mushaf layout and its root', () => {
    expect(splitLayoutHash('#/mushaf' + RHM.slice(1))).toEqual({ layout: 'mushaf', rootHash: RHM });
    expect(splitLayoutHash('#/mushaf')).toEqual({ layout: 'mushaf', rootHash: '' });
  });

  it('keeps old galaxy links as they are', () => {
    expect(splitLayoutHash(RHM)).toEqual({ layout: 'galaxy', rootHash: RHM });
    expect(splitLayoutHash('')).toEqual({ layout: 'galaxy', rootHash: '' });
    expect(splitLayoutHash('#/mushafx')).toEqual({ layout: 'galaxy', rootHash: '#/mushafx' });
  });

  it('writes hashes that read back the same', () => {
    expect(joinLayoutHash('galaxy', RHM)).toBe(RHM);
    expect(joinLayoutHash('mushaf', '')).toBe('#/mushaf');
    expect(joinLayoutHash('mushaf', RHM)).toBe('#/mushaf/root/' + encodeURIComponent('رحم'));
    expect(splitLayoutHash(joinLayoutHash('mushaf', RHM))).toEqual({ layout: 'mushaf', rootHash: RHM });
  });
});
