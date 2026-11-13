import type { MushafLayout } from './layout';
import { LIT_A, LIT_B, LIT_BOTH, type LitStates } from './lit';
import { surahStarts, VERSE_COUNTS } from './surahs';

/** Mosaic colors (from the approved design). */
export const COLORS = {
  dim: '#1a1e31',
  /** Dim dots of the surah under the pointer. */
  dimSurah: '#2c3352',
  a: '#ffc35a',
  b: '#6fd0ff',
  both: '#ffffff',
  label: 'rgba(160, 166, 200, 0.5)',
  outline: 'rgba(255, 255, 255, 0.55)',
};

/** Glow color per lit state. */
const GLOW: Record<number, string> = {
  [LIT_A]: 'rgba(255, 195, 90, 0.85)',
  [LIT_B]: 'rgba(111, 208, 255, 0.85)',
  [LIT_BOTH]: 'rgba(255, 255, 255, 0.9)',
};
const FILL: Record<number, string> = { [LIT_A]: COLORS.a, [LIT_B]: COLORS.b, [LIT_BOTH]: COLORS.both };

/** What to draw on top of the plain mosaic. */
export interface DrawState {
  /** Per-verse lit states. */
  lit: LitStates;
  /** Opacity of lit dots, 0..1 (for the fade-in). */
  alpha: number;
  /** Surah (1-based) to outline, or null. */
  surah: number | null;
  /** Verse index under the pointer, or -1. */
  active: number;
}

/** Adds one dot's square to the current path, with corners rounded like the design. */
function addDot(ctx: CanvasRenderingContext2D, x: number, y: number, d: number) {
  const radius = d >= 6 ? 2 : d >= 4 ? 1 : 0;
  if (radius && ctx.roundRect) ctx.roundRect(x, y, d, d, radius);
  else ctx.rect(x, y, d, d);
}

/** Adds the dots of one surah's rows, as padded bands, to the current path. */
function addSurahBands(ctx: CanvasRenderingContext2D, layout: MushafLayout, surah: number, pad: number) {
  const { rowStart, x, y, dot } = layout;
  const start = surahStarts[surah - 1]!;
  const end = start + VERSE_COUNTS[surah - 1]!;
  for (let r = 0; r < rowStart.length; r++) {
    const rowEnd = r + 1 < rowStart.length ? rowStart[r + 1]! : x.length;
    const first = Math.max(start, rowStart[r]!);
    const last = Math.min(end, rowEnd) - 1;
    if (first > last) continue;
    ctx.rect(x[first]! - pad, y[first]! - pad, x[last]! - x[first]! + dot + 2 * pad, dot + 2 * pad);
  }
}

/**
 * Draws the mosaic into `ctx` (CSS pixel units; the caller sets the devicePixelRatio transform):
 * row labels, dim dots, the outlined surah, then lit dots with a soft glow.
 */
export function drawMosaic(
  ctx: CanvasRenderingContext2D,
  layout: MushafLayout,
  width: number,
  height: number,
  s: DrawState,
) {
  const { x, y, dot, gap } = layout;
  ctx.clearRect(0, 0, width, height);

  // Surah outline: stroke the union of the row bands, then erase the inside, so only the outer
  // edge stays (inner edges between rows vanish). Drawn first, while the canvas is still empty.
  if (s.surah !== null) {
    const pad = Math.max(1.5, gap);
    ctx.beginPath();
    addSurahBands(ctx, layout, s.surah, pad);
    // Half the stroke is erased below, so the visible line is half this width.
    ctx.lineWidth = dot >= 6 ? 3 : 2;
    ctx.strokeStyle = COLORS.outline;
    ctx.stroke();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  // Surah numbers at the left edge.
  ctx.fillStyle = COLORS.label;
  ctx.font = `${dot >= 6 ? 10 : 8}px system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const l of layout.labels) ctx.fillText(String(l.surah), layout.left + layout.gutter - 6, l.y);

  // Dim dots: one path per color keeps this to a few draw calls.
  const inSurah = (i: number) =>
    s.surah !== null && i >= surahStarts[s.surah - 1]! && i < surahStarts[s.surah - 1]! + VERSE_COUNTS[s.surah - 1]!;
  for (const [color, wantSurah] of [[COLORS.dim, false], [COLORS.dimSurah, true]] as const) {
    ctx.beginPath();
    let any = false;
    for (let i = 0; i < x.length; i++) {
      // Lit dots are drawn over their dim square, so a fading dot never shows a hole.
      if (inSurah(i) !== wantSurah) continue;
      addDot(ctx, x[i]!, y[i]!, dot);
      any = true;
    }
    if (any) {
      ctx.fillStyle = color;
      ctx.fill();
    }
  }

  // Lit dots with a glow (shadow), one path per state.
  if (s.alpha > 0) {
    ctx.globalAlpha = s.alpha;
    ctx.shadowBlur = dot >= 6 ? 7 : 4;
    for (const state of [LIT_A, LIT_B, LIT_BOTH]) {
      ctx.beginPath();
      let any = false;
      for (let i = 0; i < x.length; i++) {
        if (s.lit[i] !== state) continue;
        addDot(ctx, x[i]!, y[i]!, dot);
        any = true;
      }
      if (!any) continue;
      ctx.shadowColor = GLOW[state]!;
      ctx.fillStyle = FILL[state]!;
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.globalAlpha = 1;
  }

  // Ring around the dot under the pointer.
  if (s.active >= 0) {
    const pad = Math.max(1, gap);
    ctx.beginPath();
    ctx.rect(x[s.active]! - pad, y[s.active]! - pad, dot + 2 * pad, dot + 2 * pad);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }
}
