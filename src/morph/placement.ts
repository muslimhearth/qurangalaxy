/** A screen rectangle (the parts of DOMRect the placement needs). */
export interface Box {
  left: number;
  top: number;
  bottom: number;
  height: number;
}

/** Width of the desktop popover, in px. */
export const POPOVER_W = 360;
/** Space between the popover and the panel. */
const GAP = 14;
/** Smallest distance to the window edge. */
const EDGE = 12;
/** Distance from the popover top to its arrow when the popover is not pushed by an edge. */
const ARROW_TOP = 60;

/** Where the desktop popover goes: left of the panel, its arrow at the tapped word's line. */
export interface PopoverPlace {
  left: number;
  top: number;
  /** Arrow position from the popover top. */
  arrowY: number;
}

/**
 * Places the desktop popover beside (left of) the panel, at the height of the tapped word.
 * It stays inside the window; the arrow keeps pointing at the word's line.
 */
export function popoverPlace(word: Box, panel: Box, cardHeight: number, viewHeight: number): PopoverPlace {
  const mid = word.top + word.height / 2;
  const top = Math.max(EDGE, Math.min(viewHeight - cardHeight - EDGE, mid - ARROW_TOP));
  const left = Math.max(EDGE, panel.left - POPOVER_W - GAP);
  // The arrow is 12 px tall; keep it on the card's edge, away from the rounded corners.
  const arrowY = Math.max(14, Math.min(cardHeight - 26, mid - top - 6));
  return { left, top, arrowY };
}

/**
 * How far to scroll the panel body (phone) so the tapped word's line shows just above the
 * bottom sheet that starts at `sheetTop`; negative scrolls up. 0 when the line is visible.
 */
export function sheetScroll(word: Box, bodyTop: number, sheetTop: number): number {
  const room = 8;
  if (word.bottom > sheetTop - room) return word.bottom - (sheetTop - room);
  if (word.top < bodyTop + room) return word.top - (bodyTop + room);
  return 0;
}
