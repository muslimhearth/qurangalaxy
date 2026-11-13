/**
 * Intro timing in seconds. Everything starts at once: each star fades in over `appear` while it
 * flies out; the whole spread takes `morph`; `wave` is the largest per-star delay (outermost star).
 */
export const INTRO = { appear: 1.2, morph: 2.4, wave: 0.6 } as const;

/** Total intro length in seconds. */
export const introLength = INTRO.morph;

/** Time-scale after the user asks to skip: what is left plays in about one second. */
const SKIP_SPEED = INTRO.morph;

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** Smooth start and stop. Clamped to [0, 1]. */
export function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

/**
 * The opening's easing: starts very slowly, keeps speeding up, and only settles a little at
 * the very end (x³ / (x³ + (1−x)^1.4)). Monotone, clamped to [0, 1].
 */
export function easeOpen(t: number): number {
  const x = clamp01(t);
  const a = x ** 3;
  const b = (1 - x) ** 1.4;
  return a + b === 0 ? 1 : a / (a + b);
}

/** How far a star has faded in (0..1) at time `t`. */
export function appearProgress(t: number, delay: number): number {
  return easeOpen((t - delay) / INTRO.appear);
}

/** How far a star has moved from the core toward its galaxy place (0..1) at time `t`. */
export function morphProgress(t: number, delay: number): number {
  return easeOpen((t - delay) / (INTRO.morph - INTRO.wave));
}

/** Gentle brightness/size factor around 1 for a star with phase `phase` at time `t`. */
export function twinkle(t: number, phase: number): number {
  return 1 + 0.12 * Math.sin(t * 2.3 + phase) * Math.sin(t * 0.9 + phase * 1.7);
}

/** Intro phase names, for the page's `data-intro` attribute (used by browser tests). */
export type IntroPhase = 'appear' | 'morph' | 'done';

/** The phase at intro time `t`. */
export function introPhase(t: number): IntroPhase {
  if (t >= introLength) return 'done';
  return t >= INTRO.appear ? 'morph' : 'appear';
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

/** Intro time that only moves forward. A skip plays the rest fast. */
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

  /** Finish quickly: play the rest of the spread at high speed. */
  skip(): void {
    this.frozen = false;
    this.speed = SKIP_SPEED;
  }

  /** Jump straight to the end (nothing to show). */
  finish(): void {
    this.t = introLength;
  }
}
