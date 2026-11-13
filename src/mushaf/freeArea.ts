/** Screen rectangle as returned by getBoundingClientRect. */
export type Rect = Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom'>;

/** An area of the screen in CSS pixels. */
export interface Area {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** UI parts that the mosaic must not sit under. */
export interface Obstacles {
  /** Root panel: a side panel (right half) on desktop or a bottom sheet on phones. Null when closed. */
  panel: Rect | null;
  /** Bars along the top edge (search field, toggle): the mosaic starts below them. */
  top: Rect[];
  /** Bars along the bottom edge (title bar on phones, toggle): the mosaic ends above them. */
  bottom: Rect[];
}

/** Width at or below which the app uses its phone layout (see styles.css). */
export const PHONE_MAX = 720;

/**
 * Part of a `width` x `height` viewport left free by the UI: below the top bars, above the bottom
 * bars and the bottom sheet, and left of a side panel, with a margin all round.
 */
export function freeArea(width: number, height: number, o: Obstacles): Area {
  const margin = width <= PHONE_MAX ? 12 : 24;
  let top = margin;
  let bottom = height - margin;
  let right = width - margin;
  for (const r of o.top) top = Math.max(top, r.bottom + margin);
  for (const r of o.bottom) bottom = Math.min(bottom, r.top - margin);
  const p = o.panel;
  if (p && p.left >= width / 2) right = Math.min(right, p.left - margin);
  // Otherwise it is a bottom sheet, at any of its sizes.
  else if (p) bottom = Math.min(bottom, p.top - margin);
  return {
    left: margin,
    top,
    width: Math.max(0, right - margin),
    height: Math.max(0, bottom - top),
  };
}
