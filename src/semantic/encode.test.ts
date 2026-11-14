import { describe, expect, it } from 'vitest';
import { encodeEmbeddings } from './encode';

describe('encodeEmbeddings', () => {
  it('normalizes, quantizes and describes the rows', () => {
    const { bin, meta } = encodeEmbeddings('m', ['1:1', '1:2'], [new Float32Array([3, 4]), new Float32Array([0, 2])]);
    expect(meta).toEqual({ model: 'm', dims: 2, encoding: 'int8', scale: 127, keys: ['1:1', '1:2'] });
    expect([...bin]).toEqual([76, 102, 0, 127]);
  });

  it('scales each normalized row by its factor, so cosines with it shrink by that factor', () => {
    const rows = [new Float32Array([3, 4]), new Float32Array([0, 2])];
    const { bin, meta } = encodeEmbeddings('m', ['1:1', '1:2'], rows, [1, 0.5]);
    expect(meta.scale).toBeCloseTo(127 / 0.8);
    expect([...new Int8Array(bin.buffer)]).toEqual([95, 127, 0, 79]);
  });

  it('needs one vector per key', () => {
    expect(() => encodeEmbeddings('m', ['1:1'], [])).toThrow(/vectors/);
  });
});
