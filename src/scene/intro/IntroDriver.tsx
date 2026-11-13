import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { useGalaxyStore } from '../../state/store';
import type { SceneModel } from '../model';
import { buildBurstPlan } from './plan';
import type { IntroState } from './state';
import { frozenIntroTime, introPhase, type IntroPhase } from './timeline';

/** Longest frame step: a slow frame jumps ahead at most this far, so the motion stays readable. */
const MAX_STEP = 0.5;
/** Radius of the glowing core the stars start in, as a share of the galaxy radius. */
const CORE = 0.06;

/**
 * Runs the opening: the stars light up in a small core at the galaxy center and spread out
 * to their places. A tap, click, key press, wheel or selection finishes it early.
 */
export function IntroDriver({ model, intro }: { model: SceneModel; intro: IntroState }) {
  useEffect(() => {
    if (intro.clock.done) return;
    const skip = () => intro.clock.skip();
    // Capture phase: the UI may stop the event, but any input still ends the intro.
    window.addEventListener('pointerdown', skip, true);
    window.addEventListener('keydown', skip, true);
    window.addEventListener('wheel', skip, true);
    // A selection from search (or the URL) also ends it.
    const unsubscribe = useGalaxyStore.subscribe((s) => s.selectedId !== null && skip());

    intro.plan = buildBurstPlan(model.matrices, model.bounds.center, model.bounds.radius * CORE);
    const frozen = frozenIntroTime(window.location.search);
    if (frozen !== null) intro.clock.freeze(frozen);
    intro.ready = true;

    return () => {
      window.removeEventListener('pointerdown', skip, true);
      window.removeEventListener('keydown', skip, true);
      window.removeEventListener('wheel', skip, true);
      unsubscribe();
    };
  }, [model, intro]);

  const frames = useRef(0);
  const phase = useRef<IntroPhase | null>(null);
  useFrame((_, dt) => {
    // Expose the phase on <body data-intro> (written only when it changes) for tests and styling.
    const now = intro.ready ? introPhase(intro.clock.t) : 'appear';
    if (now !== phase.current) document.body.dataset.intro = phase.current = now;
    if (!intro.ready || intro.clock.done) return;
    // The first frames compile shaders and can take seconds on slow GPUs: do not count them.
    frames.current++;
    intro.clock.advance(frames.current <= 2 ? 0 : Math.min(dt, MAX_STEP));
  });

  return null;
}
