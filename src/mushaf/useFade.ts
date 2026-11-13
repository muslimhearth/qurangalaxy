import { useEffect, useState } from 'react';

/** Length of the fade-in of lit dots, in ms. */
export const FADE_MS = 450;

/** True when the user asks for less motion. */
function reducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * Opacity (0..1) for lit dots: fades in from 0 each time `key` changes, with an ease-out.
 * With prefers-reduced-motion it stays at 1.
 */
export function useFade(key: unknown): number {
  const [alpha, setAlpha] = useState(1);

  useEffect(() => {
    if (reducedMotion()) {
      setAlpha(1);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / FADE_MS);
      setAlpha(1 - (1 - t) ** 3);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    setAlpha(0);
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [key]);

  return alpha;
}
