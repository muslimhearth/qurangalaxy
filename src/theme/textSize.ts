import { create } from 'zustand';

/** Verse text size choice. M is the default. */
export type TextSize = 'S' | 'M' | 'L' | 'XL';

/** All sizes, smallest first. */
export const TEXT_SIZES: readonly TextSize[] = ['S', 'M', 'L', 'XL'];

/** localStorage key of the text size. `public/theme-init.js` reads the same key. */
export const TEXT_SIZE_KEY = 'qrg.textSize.v1';

/** Reads the saved size. Unknown values and blocked storage count as M. */
export function loadTextSize(): TextSize {
  try {
    const saved = localStorage.getItem(TEXT_SIZE_KEY);
    return TEXT_SIZES.includes(saved as TextSize) ? (saved as TextSize) : 'M';
  } catch {
    return 'M';
  }
}

/** Sets `data-text-size` on `<html>`; the CSS turns it into verse text scales. */
export function applyTextSize(size: TextSize): void {
  document.documentElement.dataset.textSize = size;
}

/** Text size setting store. */
export interface TextSizeState {
  size: TextSize;
  setSize: (size: TextSize) => void;
}

/** Store of the text size, saved in localStorage and applied to the page on each change. */
export const useTextSize = create<TextSizeState>()((set) => ({
  size: loadTextSize(),
  setSize: (size) => {
    set({ size });
    applyTextSize(size);
    try {
      localStorage.setItem(TEXT_SIZE_KEY, size);
    } catch {
      // Private mode or quota: the size lasts for this page only.
    }
  },
}));
