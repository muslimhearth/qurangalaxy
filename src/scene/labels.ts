import type { Adjacency } from './neighbors';

/**
 * Ids of roots that get a text label: the selected root, the hovered root,
 * up to `maxNeighbors` strongest neighbors of each, then the `top` roots.
 * No duplicates; focus labels come first.
 */
export function labelIds(
  adj: Adjacency,
  top: readonly number[],
  selectedId: number | null,
  hoveredId: number | null,
  maxNeighbors = 24,
): number[] {
  const ids = new Set<number>();
  for (const focus of [selectedId, hoveredId]) {
    if (focus === null) continue;
    ids.add(focus);
    for (const n of (adj[focus] ?? []).slice(0, maxNeighbors)) ids.add(n.id);
  }
  for (const id of top) ids.add(id);
  return [...ids];
}
