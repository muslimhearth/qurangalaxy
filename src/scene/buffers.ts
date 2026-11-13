import type { Edge, Root } from '../data/types';
import { clusterColor } from './palette';

/** Line segment positions: two xyz points per edge, ready for a BufferGeometry. */
export function edgePositions(roots: readonly Root[], edges: readonly Edge[]): Float32Array {
  const out = new Float32Array(edges.length * 6);
  edges.forEach((e, i) => {
    out.set(roots[e.source]!.pos, i * 6);
    out.set(roots[e.target]!.pos, i * 6 + 3);
  });
  return out;
}

/** Base star colors (linear RGB, 3 floats per root) from the cluster palette. */
export function starBaseColors(roots: readonly Root[]): Float32Array {
  const out = new Float32Array(roots.length * 3);
  roots.forEach((r, i) => out.set(clusterColor(r.cluster), i * 3));
  return out;
}

/**
 * Instance matrices (16 floats per root, column-major like three.js):
 * uniform scale by the star radius, then translate to the root position.
 */
export function starMatrices(roots: readonly Root[], radii: Float32Array): Float32Array {
  const out = new Float32Array(roots.length * 16);
  roots.forEach((r, i) => {
    const s = radii[i]!;
    const [x, y, z] = r.pos;
    out.set([s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, x, y, z, 1], i * 16);
  });
  return out;
}
