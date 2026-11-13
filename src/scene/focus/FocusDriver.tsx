import { useFrame } from '@react-three/fiber';
import type { IntroState } from '../intro/state';
import type { FocusState } from './state';

/**
 * Steps the focus glide once per frame. Mount it before the stars, links and labels, so they
 * read this frame's positions. Waits for the intro: the stars are not at home before it ends.
 * Exposes `<body data-focus="moving|still">` for browser tests.
 */
export function FocusDriver({ focus, intro }: { focus: FocusState; intro: IntroState }) {
  useFrame(({ clock }) => {
    if (!intro.clock.done) return;
    focus.glide.step(clock.elapsedTime);
    const now = focus.glide.animating ? 'moving' : 'still';
    if (document.body.dataset.focus !== now) document.body.dataset.focus = now;
  });
  return null;
}
