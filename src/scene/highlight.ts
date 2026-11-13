import type { Edge } from '../data/types';
import type { Adjacency } from './neighbors';

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
const STAR = {
  strong: { focus: 1.8, other: 0.12 },
  soft: { focus: 1.5, other: 0.4 },
};
// Edge factors: `linked` is absolute, `other` is relative to the base level.
const EDGE = {
  strong: { linked: 1.0, other: 0.15 },
  soft: { linked: 0.6, other: 0.5 },
};

/**
 * Default edge brightness. Lines blend additively, so thousands of them would
 * pile up into a white core; fade them as the edge count grows (1/sqrt).
 */
export function edgeBaseLevel(edgeCount: number): number {
  return Math.min(0.14, 1.5 / Math.sqrt(Math.max(1, edgeCount)));
}

/**
 * Star colors for a focus: the focus root brightens, its neighbors keep their color,
 * all other stars dim. Returns a new buffer (3 floats per star).
 */
export function starColors(base: Float32Array, adj: Adjacency, focus: Focus | null): Float32Array {
  const out = new Float32Array(base);
  if (!focus) return out;
  const f = focus.strong ? STAR.strong : STAR.soft;
  const keep = new Set(adj[focus.id]?.map((n) => n.id));
  for (let i = 0; i < out.length / 3; i++) {
    const k = i === focus.id ? f.focus : keep.has(i) ? 1 : f.other;
    out[i * 3] = base[i * 3]! * k;
    out[i * 3 + 1] = base[i * 3 + 1]! * k;
    out[i * 3 + 2] = base[i * 3 + 2]! * k;
  }
  return out;
}

/**
 * Line colors for all edges (2 vertices x 3 floats per edge). Each end takes its
 * star's base color, scaled: faint by default, bright on edges of the focus,
 * near-black on the other edges.
 */
export function edgeColors(
  edges: readonly Edge[],
  starBase: Float32Array,
  focus: Focus | null,
): Float32Array {
  const out = new Float32Array(edges.length * 6);
  const f = focus ? (focus.strong ? EDGE.strong : EDGE.soft) : null;
  const base = edgeBaseLevel(edges.length);
  edges.forEach((e, i) => {
    const linked = focus !== null && (e.source === focus.id || e.target === focus.id);
    const k = f ? (linked ? f.linked : f.other * base) : base;
    for (const [end, root] of [
      [0, e.source],
      [1, e.target],
    ] as const) {
      for (let c = 0; c < 3; c++) out[i * 6 + end * 3 + c] = starBase[root * 3 + c]! * k;
    }
  });
  return out;
}
