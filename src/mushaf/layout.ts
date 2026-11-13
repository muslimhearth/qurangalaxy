/** Dot sizes in CSS pixels for one zoom level of the mosaic. */
export interface DotSize {
  /** Side of one square dot. */
  dot: number;
  /** Space between two dots, across and down. */
  gap: number;
  /** Extra space before a surah that starts in the middle of a row. */
  surahGap: number;
}

/**
 * Sizes for a dot of `dot` px. Gaps grow with the dot: 8 px dots get 2 px gaps, 4 px dots 1 px
 * (as in the approved design).
 */
export function sizeFor(dot: number): DotSize {
  return { dot, gap: Math.max(1, dot / 4), surahGap: Math.max(2, dot * 0.75) };
}

/** Dot positions from `flow`, before the mosaic is placed on screen. */
export interface Flow {
  /** Left edge of each dot, in Mushaf order. */
  x: Float32Array;
  /** Top edge of each dot. */
  y: Float32Array;
  /** Index of the first verse of each row. */
  rowStart: number[];
  /** Right edge of the widest row. */
  width: number;
  /** Bottom edge of the last row. */
  height: number;
}

/**
 * Lays out the verses (`counts` = verses per surah) left to right in rows of at most `width` px,
 * wrapping as needed. A surah that starts mid-row gets an extra `surahGap` before it.
 */
export function flow(counts: readonly number[], size: DotSize, width: number): Flow {
  const total = counts.reduce((a, b) => a + b, 0);
  const x = new Float32Array(total);
  const y = new Float32Array(total);
  const rowStart: number[] = [];
  const pitch = size.dot + size.gap;
  let cx = 0;
  let row = -1;
  let i = 0;
  let maxRight = 0;
  for (const count of counts) {
    if (cx > 0) cx += size.surahGap;
    for (let a = 0; a < count; a++, i++) {
      if (row < 0 || cx + size.dot > width) {
        row++;
        cx = 0;
        rowStart.push(i);
      }
      x[i] = cx;
      y[i] = row * pitch;
      maxRight = Math.max(maxRight, cx + size.dot);
      cx += pitch;
    }
  }
  return { x, y, rowStart, width: maxRight, height: (row + 1) * pitch - size.gap };
}

/** A surah number shown at the left edge of a row. */
export interface RowLabel {
  /** Surah number, 1-based. */
  surah: number;
  /** Vertical center of the row, in canvas pixels. */
  y: number;
}

/** The mosaic placed in a canvas: dot positions, sizes and row labels. */
export interface MushafLayout extends DotSize {
  /** Dot pitch: `dot + gap`. */
  pitch: number;
  /** Width of the surah-number column left of the dots. */
  gutter: number;
  /** Left edge of each dot in canvas pixels, in Mushaf order. */
  x: Float32Array;
  /** Top edge of each dot in canvas pixels. */
  y: Float32Array;
  /** Index of the first verse of each row. */
  rowStart: number[];
  /** Top of the first row in canvas pixels. */
  top: number;
  /** Bottom of the last row in canvas pixels. */
  bottom: number;
  /** Left edge of the label column in canvas pixels. */
  left: number;
  /** Surah numbers for the row starts, thinned out so they never crowd. */
  labels: RowLabel[];
}

/** Dot sizes tried, largest first, in CSS pixels. Fine steps let the mosaic fill its area. */
const DOT_STEPS = Array.from({ length: 41 }, (_, i) => 12 - i * 0.25);
/** Minimum vertical distance between two row labels (the label font is about 9 px). */
const LABEL_SPACING = 11;

/**
 * Lays out all verses (`counts` = verses per surah) in a `width` x `height` area: picks the largest
 * dot size that fits without scrolling, centers the mosaic and labels the rows with surah numbers.
 */
export function mushafLayout(counts: readonly number[], width: number, height: number): MushafLayout {
  let size = sizeFor(2);
  let gutter = 0;
  let f: Flow | null = null;
  for (const dot of DOT_STEPS) {
    size = sizeFor(dot);
    gutter = dot >= 6 ? 26 : 18;
    f = flow(counts, size, width - gutter);
    if (f.height <= height) break;
  }
  const fl = f!;
  const left = Math.max(0, Math.floor((width - gutter - fl.width) / 2));
  const top = Math.max(0, Math.floor((height - fl.height) / 2));
  const x = fl.x.map((v) => v + left + gutter);
  const y = fl.y.map((v) => v + top);
  const pitch = size.dot + size.gap;
  const labels = rowLabels(counts, fl.rowStart, top, pitch, size.dot);
  return { ...size, pitch, gutter, x, y, rowStart: fl.rowStart, top, bottom: top + fl.height, left, labels };
}

/** Labels each row with the first surah that starts in it, skipping rows too close to the last label. */
function rowLabels(
  counts: readonly number[],
  rowStart: number[],
  top: number,
  pitch: number,
  dot: number,
): RowLabel[] {
  const labels: RowLabel[] = [];
  let start = 0;
  let row = 0;
  for (let s = 0; s < counts.length; s++) {
    // Row that holds this surah's first verse.
    while (row + 1 < rowStart.length && rowStart[row + 1]! <= start) row++;
    const y = top + row * pitch + dot / 2;
    const last = labels[labels.length - 1];
    if (!last || y - last.y >= LABEL_SPACING) labels.push({ surah: s + 1, y });
    start += counts[s]!;
  }
  return labels;
}

/**
 * Index of the dot nearest to point (`px`, `py`) in canvas pixels, if its edge is within `radius` px;
 * otherwise -1. Checks only the rows near the point.
 */
export function hitTest(layout: MushafLayout, px: number, py: number, radius: number): number {
  const { rowStart, x, y, dot, pitch, top } = layout;
  const rows = rowStart.length;
  const reach = Math.ceil(radius / pitch) + 1;
  const center = Math.floor((py - top) / pitch);
  let best = -1;
  let bestDist = radius;
  for (let r = Math.max(0, center - reach); r <= Math.min(rows - 1, center + reach); r++) {
    const end = r + 1 < rows ? rowStart[r + 1]! : x.length;
    for (let i = rowStart[r]!; i < end; i++) {
      // Distance from the point to the dot's square (0 inside it).
      const dx = Math.max(x[i]! - px, 0, px - x[i]! - dot);
      const dy = Math.max(y[i]! - py, 0, py - y[i]! - dot);
      const d = Math.hypot(dx, dy);
      if (d <= bestDist) {
        best = i;
        bestDist = d;
      }
    }
  }
  return best;
}

/** Height (px) the tooltip needs above a dot. */
export const TIP_ROOM = 80;

/**
 * Whether the tooltip goes below the dot: true when the dot sits less than `TIP_ROOM` px
 * below the top of the free area, where a tooltip above it would cover the search or title bar.
 */
export function tipBelow(dotTopInArea: number): boolean {
  return dotTopInArea < TIP_ROOM;
}
