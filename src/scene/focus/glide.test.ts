import { describe, expect, it } from 'vitest';
import { Glide } from './glide';

// Three stars at x = 0, 10, 20.
const home = () => new Float32Array([0, 0, 0, 10, 0, 0, 20, 0, 0]);
const pos = (g: Glide, i: number) => Array.from(g.positions.subarray(i * 3, i * 3 + 3));
const moved = (g: Glide) => Array.from(g.moved.subarray(0, g.movedCount)).sort();

describe('Glide', () => {
  it('starts with every star at home and nothing moving', () => {
    const g = new Glide(home(), 1);
    g.step(0);
    expect(pos(g, 1)).toEqual([10, 0, 0]);
    expect(g.movedCount).toBe(0);
    expect(g.animating).toBe(false);
  });

  it('glides the targeted stars from home to their targets with an eased start', () => {
    const g = new Glide(home(), 1);
    g.setTargets([1], new Float32Array([10, 5, 0]));
    g.step(3); // the glide clock starts at the first step
    expect(pos(g, 1)).toEqual([10, 0, 0]);
    g.step(3.2);
    const early = pos(g, 1)[1]!;
    expect(early).toBeGreaterThan(0);
    expect(early).toBeLessThan(1); // eased: slow start
    g.step(3.5);
    expect(pos(g, 1)[1]).toBeCloseTo(2.5);
    expect(moved(g)).toEqual([1]);
    g.step(4);
    expect(pos(g, 1)).toEqual([10, 5, 0]);
    expect(g.animating).toBe(false);
    // Once there, the star no longer counts as moving.
    g.step(4.1);
    expect(g.movedCount).toBe(0);
  });

  it('sends stars home when they are no longer targeted, and re-forms from where they are', () => {
    const g = new Glide(home(), 1);
    g.setTargets([1], new Float32Array([10, 5, 0]));
    g.step(0);
    g.step(0.5); // halfway: star 1 at y = 2.5
    g.setTargets([2], new Float32Array([20, -4, 0]));
    g.step(0.6); // new glide starts here, from the current positions
    expect(pos(g, 1)[1]).toBeCloseTo(2.5);
    expect(moved(g)).toEqual([1, 2]);
    g.step(1.6);
    expect(pos(g, 1)).toEqual([10, 0, 0]);
    expect(pos(g, 2)).toEqual([20, -4, 0]);
    g.setTargets([], new Float32Array(0));
    g.step(2);
    g.step(3);
    expect(pos(g, 2)).toEqual([20, 0, 0]);
  });

  it('jumps at once with a zero duration (reduced motion)', () => {
    const g = new Glide(home(), 0);
    g.setTargets([0], new Float32Array([1, 2, 3]));
    g.step(0);
    expect(pos(g, 0)).toEqual([1, 2, 3]);
    expect(moved(g)).toEqual([0]);
    expect(g.animating).toBe(false);
  });

  it('reports a star once per step even when it stays targeted', () => {
    const g = new Glide(home(), 1);
    g.setTargets([0, 1], new Float32Array([0, 1, 0, 10, 1, 0]));
    g.step(0);
    g.setTargets([1, 0], new Float32Array([10, 2, 0, 0, 2, 0]));
    g.step(0.5);
    expect(moved(g)).toEqual([0, 1]);
  });

  it('jumps to the end state at the next step when asked (tab restore), then glides normally again', () => {
    const g = new Glide(home(), 1);
    g.setTargets([1], new Float32Array([10, 5, 0]), true);
    expect(g.animating).toBe(true);
    g.step(7);
    expect(pos(g, 1)).toEqual([10, 5, 0]);
    expect(moved(g)).toEqual([1]);
    expect(g.animating).toBe(false);
    g.setTargets([], new Float32Array(0));
    g.step(8);
    g.step(8.5);
    expect(pos(g, 1)[1]).toBeCloseTo(2.5);
  });
});
