import type { DustPlan, IntroPlan } from './plan';
import { IntroClock, shouldSkipIntro, type SkipContext } from './timeline';

/**
 * Mutable intro state shared by the scene parts. Read in `useFrame`, never through React
 * state, so the animation causes no re-render.
 */
export interface IntroState {
  clock: IntroClock;
  /** False when the intro was skipped at start-up. */
  played: boolean;
  /** Star plan; null until the font is loaded and the words are sampled. */
  plan: IntroPlan | null;
  /** Calligraphy dust plan; null like `plan`. */
  dust: DustPlan | null;
  /** True once the clock may run (plans built, or nothing to play). */
  ready: boolean;
}

/** Fresh intro state. `skip` starts it finished: the galaxy shows at once. */
export function createIntroState(skip: boolean): IntroState {
  return { clock: new IntroClock(skip), played: !skip, plan: null, dust: null, ready: skip };
}

/** The skip inputs from the browser: reduced-motion setting and the URL. */
export function readSkipContext(): SkipContext {
  if (typeof window === 'undefined') return { reducedMotion: true, hash: '', search: '' };
  return {
    reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    automated: navigator.webdriver === true,
    hash: window.location.hash,
    search: window.location.search,
  };
}

/** Intro state for this page load, honoring the skip rules. */
export function introForPageLoad(): IntroState {
  return createIntroState(shouldSkipIntro(readSkipContext()));
}
