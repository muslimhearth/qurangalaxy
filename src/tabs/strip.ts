/** Which sides of the tab strip hide pills (and so fade), and whether any pill is hidden. */
export interface EdgeFades {
  overflow: boolean;
  start: boolean;
  end: boolean;
}

/** Browsers round scroll sizes; differences below this are no overflow. */
const SLACK = 1;

/** Overflow state of a strip from its scroll position, content width and visible width. */
export function edgeFades(scrollLeft: number, scrollWidth: number, clientWidth: number): EdgeFades {
  const overflow = scrollWidth - clientWidth > SLACK;
  return {
    overflow,
    start: overflow && scrollLeft > SLACK,
    end: overflow && scrollLeft + clientWidth < scrollWidth - SLACK,
  };
}

/** A pill's left and right edge in strip content coordinates. */
export interface Span {
  start: number;
  end: number;
}

/** The strip's scroll position, visible width and largest scroll position. */
export interface View {
  scroll: number;
  width: number;
  max: number;
}

/**
 * Scroll position that shows a pill in full, `margin` pixels clear of each edge (the fades).
 * Keeps the current position when the pill is already in view; a pill wider than the view
 * shows its start.
 */
export function revealScroll(pill: Span, view: View, margin: number): number {
  let next = view.scroll;
  if (pill.end + margin > view.scroll + view.width) next = pill.end + margin - view.width;
  if (pill.start - margin < next) next = pill.start - margin;
  return Math.min(view.max, Math.max(0, next));
}
