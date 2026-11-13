import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import type { PerspectiveCamera } from 'three';
import { useGalaxyStore } from '../../state/store';
import type { SceneModel } from '../model';
import { placeOnPlane, textFrame } from './frame';
import { drawPhrase, waitForPhraseFont } from './glyphs';
import { IntroDust } from './IntroDust';
import { phraseLines } from './phrase';
import { buildDustPlan, buildIntroPlan } from './plan';
import { sampleGlyphPoints } from './sample';
import type { IntroState } from './state';
import { frozenIntroTime, introPhase, type IntroPhase } from './timeline';

/** Longest wait for the Arabic font before the intro is dropped. */
const FONT_TIMEOUT_MS = 3000;
/** Longest frame step: a slow frame jumps ahead at most this far, so the motion stays readable. */
const MAX_STEP = 0.5;

/** Dust particles for the calligraphy: fewer on small (phone) screens. */
const dustCount = (width: number) => (width < 700 ? 7000 : 14000);

/**
 * Prepares and runs the intro: waits for the font, samples the words, plans the stars and the
 * dust, advances the intro clock each frame, and lets a tap, click or key press finish it early.
 */
export function IntroDriver({ model, intro }: { model: SceneModel; intro: IntroState }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const [dustOn, setDustOn] = useState(false);

  useEffect(() => {
    if (intro.clock.done) return;
    let cancelled = false;
    const skip = () => intro.clock.skip();
    // Capture phase: the UI may stop the event, but any input still ends the intro.
    window.addEventListener('pointerdown', skip, true);
    window.addEventListener('keydown', skip, true);
    window.addEventListener('wheel', skip, true);
    // A selection from search (or the URL) also ends it.
    const unsubscribe = useGalaxyStore.subscribe((s) => s.selectedId !== null && skip());

    void (async () => {
      const aspect = size.width / size.height;
      const lines = phraseLines(aspect);
      const fontOk = await waitForPhraseFont(lines.join(' '), FONT_TIMEOUT_MS);
      if (cancelled) return;
      const img = fontOk ? drawPhrase(lines) : null;
      if (!img) {
        intro.clock.finish();
        intro.ready = true;
        return;
      }
      const frame = textFrame(model.bounds, camera.fov, aspect);
      const n = model.radii.length;
      const depth = model.bounds.radius * 0.06;
      const stars = placeOnPlane(sampleGlyphPoints(img, n, 1), img.width, img.height, frame, depth, 2);
      intro.plan = buildIntroPlan(model.matrices, stars, frame);
      const dust = placeOnPlane(sampleGlyphPoints(img, dustCount(size.width), 3), img.width, img.height, frame, depth, 4);
      intro.dust = buildDustPlan(dust, frame, model.bounds.radius * 0.25);
      const frozen = frozenIntroTime(window.location.search);
      if (frozen !== null) intro.clock.freeze(frozen);
      intro.ready = true;
      setDustOn(true);
    })();

    return () => {
      cancelled = true;
      window.removeEventListener('pointerdown', skip, true);
      window.removeEventListener('keydown', skip, true);
      window.removeEventListener('wheel', skip, true);
      unsubscribe();
    };
    // The start view is fixed once; later resizes do not re-plan the intro.
  }, [model, intro]);

  const frames = useRef(0);
  const phase = useRef<IntroPhase | null>(null);
  useFrame((_, dt) => {
    // Expose the phase on <body data-intro> (written only when it changes) for tests and styling.
    const now = intro.ready ? introPhase(intro.clock.t) : 'appear';
    if (now !== phase.current) document.body.dataset.intro = phase.current = now;
    if (!intro.ready || intro.clock.done) {
      if (dustOn && intro.clock.done) setDustOn(false);
      return;
    }
    // The first frames compile shaders and can take seconds on slow GPUs: do not count them.
    frames.current++;
    intro.clock.advance(frames.current <= 2 ? 0 : Math.min(dt, MAX_STEP));
  });

  return dustOn && intro.dust ? <IntroDust dust={intro.dust} intro={intro} size={model.radiusRange.min} /> : null;
}
