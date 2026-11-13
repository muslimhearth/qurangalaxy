import { describe, expect, it } from 'vitest';
import { encodeEmbeddings } from './encode';

describe('encodeEmbeddings', () => {
  it('normalizes, quantizes and describes the rows', () => {
    const { bin, meta } = encodeEmbeddings('m', ['1:1', '1:2'], [new Float32Array([3, 4]), new Float32Array([0, 2])]);
    expect(meta).toEqual({ model: 'm', dims: 2, encoding: 'int8', scale: 127, keys: ['1:1', '1:2'] });
    expect([...bin]).toEqual([76, 102, 0, 127]);
  });

  it('needs one vector per key', () => {
    expect(() => encodeEmbeddings('m', ['1:1'], [])).toThrow(/vectors/);
  });
});
