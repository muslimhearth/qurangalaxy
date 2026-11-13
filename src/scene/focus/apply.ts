import type { Edge } from '../../data/types';
import type { Adjacency } from '../neighbors';
import type { Glide } from './glide';

/** Copies the positions of the stars moved in the last glide step into instance matrices (16 floats per star). */
export function writeStarPositions(matrices: Float32Array, glide: Glide): void {
  const { positions, moved } = glide;
  for (let i = 0; i < glide.movedCount; i++) {
    const id = moved[i]!;
    matrices[id * 16 + 12] = positions[id * 3]!;
    matrices[id * 16 + 13] = positions[id * 3 + 1]!;
    matrices[id * 16 + 14] = positions[id * 3 + 2]!;
  }
}

/**
 * Moves the line ends (2 points x 3 floats per edge) that sit on stars moved in the last glide
 * step, so the links stay attached to their stars.
 */
export function writeEdgeEnds(lines: Float32Array, edges: readonly Edge[], adj: Adjacency, glide: Glide): void {
  const { positions, moved } = glide;
  for (let i = 0; i < glide.movedCount; i++) {
    const id = moved[i]!;
    const list = adj[id] ?? [];
    for (let j = 0; j < list.length; j++) {
      const e = list[j]!.edge;
      // The star is the source (first point) or the target (second point) of the edge.
      const at = e * 6 + (edges[e]!.source === id ? 0 : 3);
      lines[at] = positions[id * 3]!;
      lines[at + 1] = positions[id * 3 + 1]!;
      lines[at + 2] = positions[id * 3 + 2]!;
    }
  }
}
