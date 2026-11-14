import type { Edge } from '../data/types';
import { topNeighbors, type Adjacency } from './neighbors';

/** The root the highlight centers on. `strong` is true for a selection, false for a hover. */
export interface Focus {
  id: number;
  strong: boolean;
}

/** Highlight focus: the selected root wins over the hovered root. */
export function focusOf(selectedId: number | null, hoveredId: number | null): Focus | null {
  if (selectedId !== null) return { id: selectedId, strong: true };
  if (hoveredId !== null) return { id: hoveredId, strong: false };
  return null;
}

// Brightness factors. Values above 1 push the focus star into the bloom.
// `top`: the strongest neighbors; `rest`: the other neighbors; `other`: unrelated stars.
// On selection, unrelated stars fade far down so every connected root stands out (8x brighter).
const STAR = {
  // `rest` 0.7: links past the top 20 must stay clearly visible, their end stars too.
  strong: { focus: 1.8, top: 1, rest: 0.7, other: 0.05 },
  soft: { focus: 1.5, top: 1, rest: 0.6, other: 0.4 },
};
// Edge factors: `top` is absolute (scaled by score); `rest` and `other` are relative to the base level.
// On selection, the links past the top 20 use FAINT_LINK instead of `rest`.
const EDGE = {
  strong: { top: 1.0, rest: 0, other: 0.15 },
  soft: { top: 0.6, rest: 1.5, other: 0.5 },
};

/**
 * Level of a selected root's links past the top 20. Absolute: 1.5 × the base level was about 0.03
 * with real data, too faint to see. 0.18 is below the dimmest bright link (0.3), so the top 20
 * still stand out.
 */
export const FAINT_LINK = 0.18;

/**
 * Default edge brightness. Lines blend additively, so thousands of them would
 * pile up into a white core; fade them as the edge count grows (1/sqrt).
 */
export function edgeBaseLevel(edgeCount: number): number {
  return Math.min(0.14, 1.5 / Math.sqrt(Math.max(1, edgeCount)));
}

/**
 * Brightness factor of one of the focus root's strongest links, from its score relative to
 * the strongest link (`maxScore`). Square root, floored at 0.3: weak links stay visible.
 */
export function linkScoreLevel(score: number, maxScore: number): number {
  return maxScore > 0 ? 0.3 + 0.7 * Math.sqrt(score / maxScore) : 1;
}

/**
 * Star colors for a focus: the focus root brightens, its strongest neighbors keep their color,
 * its other neighbors dim a little, all other stars dim more. Returns a new buffer (3 floats per star).
 */
export function starColors(base: Float32Array, adj: Adjacency, focus: Focus | null): Float32Array {
  const out = new Float32Array(base);
  if (!focus) return out;
  const f = focus.strong ? STAR.strong : STAR.soft;
  const top = new Set(topNeighbors(adj, focus.id).map((n) => n.id));
  const rest = new Set(adj[focus.id]?.map((n) => n.id));
  for (let i = 0; i < out.length / 3; i++) {
    const k = i === focus.id ? f.focus : top.has(i) ? f.top : rest.has(i) ? f.rest : f.other;
    out[i * 3] = base[i * 3]! * k;
    out[i * 3 + 1] = base[i * 3 + 1]! * k;
    out[i * 3 + 2] = base[i * 3 + 2]! * k;
  }
  return out;
}

/**
 * Line colors for all edges (2 vertices x 3 floats per edge). Each end takes its
 * star's base color, scaled: faint by default; on the focus root's `TOP_LINKS` strongest
 * edges bright by score; faint on its other edges; near-black on all other edges.
 */
export function edgeColors(
  edges: readonly Edge[],
  starBase: Float32Array,
  adj: Adjacency,
  focus: Focus | null,
): Float32Array {
  const out = new Float32Array(edges.length * 6);
  const f = focus ? (focus.strong ? EDGE.strong : EDGE.soft) : null;
  const base = edgeBaseLevel(edges.length);
  // Brightness per edge index of the focus edges; every other edge uses the shared level.
  const level = new Map<number, number>();
  if (focus && f) {
    const top = topNeighbors(adj, focus.id);
    const maxScore = top[0]?.score ?? 1;
    const rest = focus.strong ? FAINT_LINK : f.rest * base;
    for (const n of adj[focus.id] ?? []) level.set(n.edge, rest);
    for (const n of top) level.set(n.edge, f.top * linkScoreLevel(n.score, maxScore));
  }
  const otherK = f ? f.other * base : base;
  edges.forEach((e, i) => {
    const k = level.get(i) ?? otherK;
    for (const [end, root] of [
      [0, e.source],
      [1, e.target],
    ] as const) {
      for (let c = 0; c < 3; c++) out[i * 6 + end * 3 + c] = starBase[root * 3 + c]! * k;
    }
  });
  return out;
}
