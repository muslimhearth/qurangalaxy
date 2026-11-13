/** Intro phase lengths in seconds. `wave` is the largest per-star delay (right edge first). */
export const INTRO = { appear: 1.6, hold: 2.5, morph: 3.2, wave: 1.1 } as const;

/** Total intro length in seconds. */
export const introLength = INTRO.appear + INTRO.hold + INTRO.morph;

/** Time-scale of the morph after the user asks to skip: about one second left. */
const SKIP_SPEED = INTRO.morph;

/** Strongest pull of a star toward its glyph point (smallest star); the galaxy stays a galaxy. */
export const MAX_PULL = 0.55;
/** Weakest pull (largest star): big stars keep almost their real place as landmarks. */
export const MIN_PULL = 0.2;

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** Smooth start and stop. Clamped to [0, 1]. */
export function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

/** Soft ease-out for things that light up. Clamped to [0, 1]. */
export function easeOutCubic(t: number): number {
  return 1 - (1 - clamp01(t)) ** 3;
}

/**
 * Per-star delay in seconds from its horizontal place in the text (0 = left edge, 1 = right edge).
 * Arabic reads right to left, so the wave starts at the right.
 */
export function starDelay(xNorm: number): number {
  return INTRO.wave * (1 - clamp01(xNorm));
}

/** How far a star has lit up (0..1) at time `t`; the wave runs over the first part of the phase. */
export function appearProgress(t: number, delay: number): number {
  const span = INTRO.appear * 0.5;
  return easeOutCubic((t - (delay / INTRO.wave) * (INTRO.appear - span)) / span);
}

/** How far a star has moved from the word toward its galaxy place (0..1) at time `t`. */
export function morphProgress(t: number, delay: number): number {
  const span = INTRO.morph - INTRO.wave;
  return easeInOutCubic((t - INTRO.appear - INTRO.hold - delay) / span);
}

/** Pull toward the glyph point for a star of relative size `sizeRank` (0 smallest .. 1 largest). */
export function pullAmount(sizeRank: number): number {
  return MAX_PULL - (MAX_PULL - MIN_PULL) * clamp01(sizeRank);
}

/** Gentle brightness/size factor around 1 for a star with phase `phase` at time `t`. */
export function twinkle(t: number, phase: number): number {
  return 1 + 0.12 * Math.sin(t * 2.3 + phase) * Math.sin(t * 0.9 + phase * 1.7);
}

/** Intro phase names, for the page's `data-intro` attribute (used by browser tests). */
export type IntroPhase = 'appear' | 'words' | 'morph' | 'done';

/** The phase at intro time `t`. */
export function introPhase(t: number): IntroPhase {
  if (t >= introLength) return 'done';
  if (t >= INTRO.appear + INTRO.hold) return 'morph';
  return t >= INTRO.appear ? 'words' : 'appear';
}

/** What the skip rule looks at, read from the browser at start-up. */
export interface SkipContext {
  reducedMotion: boolean;
  /** The browser is driven by a test tool (`navigator.webdriver`). */
  automated?: boolean;
  hash: string;
  search: string;
}

/**
 * True when the intro must not play: reduced motion, a root deep link or `?nointro`.
 * Browser tests (automated) skip it too, so they need not wait, unless the URL has `?intro`.
 */
export function shouldSkipIntro({ reducedMotion, automated = false, hash, search }: SkipContext): boolean {
  const params = new URLSearchParams(search);
  if (reducedMotion || hash.startsWith('#/root/') || params.has('nointro')) return true;
  return automated && !params.has('intro');
}

/**
 * Frozen intro time from `?introAt=<seconds>` (for screenshots and tuning), or null.
 * The intro then holds that moment until a tap or key press.
 */
export function frozenIntroTime(search: string): number | null {
  const v = new URLSearchParams(search).get('introAt');
  if (v === null || v.trim() === '') return null;
  const t = Number(v);
  return Number.isFinite(t) ? Math.min(introLength, Math.max(0, t)) : null;
}

/** Intro time that only moves forward. A skip jumps to the morph and plays it fast. */
export class IntroClock {
  /** Seconds since the intro started, 0..introLength. */
  t: number;
  private speed = 1;
  private frozen = false;

  /** `finished` starts the clock at the end (intro skipped). */
  constructor(finished = false) {
    this.t = finished ? introLength : 0;
  }

  /** True once the stars are at their galaxy places. */
  get done(): boolean {
    return this.t >= introLength;
  }

  /** Moves time forward by `dt` seconds. */
  advance(dt: number): void {
    if (this.frozen) return;
    this.t = Math.min(introLength, this.t + dt * this.speed);
  }

  /** Holds time at `t` until a skip (see `frozenIntroTime`). */
  freeze(t: number): void {
    this.t = t;
    this.frozen = true;
  }

  /** Finish quickly: skip the rest of the hold and speed up the morph. */
  skip(): void {
    this.frozen = false;
    this.t = Math.max(this.t, INTRO.appear + INTRO.hold);
    this.speed = SKIP_SPEED;
  }

  /** Jump straight to the end (nothing to show, e.g. the font did not load). */
  finish(): void {
    this.t = introLength;
  }
}
