import { Glide } from './glide';

/** Seconds the stars take to glide into the focus ring and back: a bit longer than the camera ease. */
export const GLIDE_SECONDS = 1.2;

/**
 * Mutable focus state shared by the scene parts. Read in `useFrame`, never through React state,
 * so the glide causes no re-render. `glide.positions` is the one source of star positions for
 * stars, links, labels and tap picking.
 */
export interface FocusState {
  glide: Glide;
}

/** Fresh focus state with every star at `home` (3 floats per star). Reduced motion jumps. */
export function createFocusState(home: Float32Array, reducedMotion: boolean): FocusState {
  return { glide: new Glide(home, reducedMotion ? 0 : GLIDE_SECONDS) };
}

/** True when the user asks for less motion. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
}
