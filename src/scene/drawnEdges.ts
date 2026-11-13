import type { Focus } from './highlight';
import type { Adjacency } from './neighbors';

/**
 * Fills `out` with the vertex indices (2 per edge) of the line segments to draw and returns how
 * many it wrote. With a selection only the selected root's edges are drawn: the other edges are
 * dimmed below one 8-bit color step anyway, and with the camera close to the focus ring they are
 * long on screen, so drawing them costs a lot (software renderers) for no visible light.
 * With a hover or no focus, every edge is drawn.
 */
export function drawnEdges(edgeCount: number, adj: Adjacency, focus: Focus | null, out: Uint32Array): number {
  if (!focus?.strong) {
    for (let i = 0; i < edgeCount * 2; i++) out[i] = i;
    return edgeCount * 2;
  }
  let n = 0;
  for (const { edge } of adj[focus.id] ?? []) {
    out[n++] = edge * 2;
    out[n++] = edge * 2 + 1;
  }
  return n;
}
