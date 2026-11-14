import { useSyncExternalStore } from 'react';

/** How the tabs show: pills next to the search bar, or a counter button that opens a switcher. */
export type TabLayout = 'strip' | 'counter';

/** Screens that get the pill strip: a mouse and room for pills. Phones and narrow windows get the counter. */
export const TAB_STRIP_QUERY = '(min-width: 1024px) and (pointer: fine)';

/** The media query list, or null where `matchMedia` is missing (tests, old browsers). */
const media = (): MediaQueryList | null => (typeof window.matchMedia === 'function' ? window.matchMedia(TAB_STRIP_QUERY) : null);

function subscribe(onChange: () => void): () => void {
  const m = media();
  m?.addEventListener?.('change', onChange);
  return () => m?.removeEventListener?.('change', onChange);
}

/** The tab layout for the current screen; follows window resizes. No `matchMedia`: the strip. */
export function useTabLayout(): TabLayout {
  return useSyncExternalStore(subscribe, () => (media()?.matches ?? true ? 'strip' : 'counter'));
}
