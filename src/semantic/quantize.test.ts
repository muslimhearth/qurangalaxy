import { describe, expect, it } from 'vitest';
import { dequantizeRow, l2normalize, quantizeInt8 } from './quantize';

describe('l2normalize', () => {
  it('scales a vector to length 1', () => {
    const v = l2normalize(new Float32Array([3, 4]));
    expect(v[0]).toBeCloseTo(0.6);
    expect(v[1]).toBeCloseTo(0.8);
  });

  it('leaves a zero vector at zero', () => {
    expect([...l2normalize(new Float32Array([0, 0]))]).toEqual([0, 0]);
  });
});

describe('quantizeInt8', () => {
  const rows = [new Float32Array([0.5, -0.25]), new Float32Array([-0.1, 0.4])];

  it('maps the largest absolute value to 127', () => {
    const q = quantizeInt8(rows);
    expect(q.scale).toBeCloseTo(127 / 0.5);
    expect([...q.data]).toEqual([127, -64, -25, 102]);
  });

  it('round-trips within one quantization step', () => {
    const q = quantizeInt8(rows);
    const back = dequantizeRow(q.data, q.scale, 1, 2);
    expect(back[0]).toBeCloseTo(-0.1, 2);
    expect(back[1]).toBeCloseTo(0.4, 2);
  });

  it('rejects rows of different length', () => {
    expect(() => quantizeInt8([new Float32Array(2), new Float32Array(3)])).toThrow(/length/);
  });

  it('gives scale 1 for all-zero input', () => {
    expect(quantizeInt8([new Float32Array(2)]).scale).toBe(1);
  });
});
