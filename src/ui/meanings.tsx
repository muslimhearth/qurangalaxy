import { create } from 'zustand';

/** localStorage key of the "Show meanings" setting. */
export const MEANINGS_KEY = 'qrg.showMeanings.v1';

/** Reads the saved setting: on unless "false" is saved. Blocked storage counts as on. */
export function loadShowMeanings(): boolean {
  try {
    return localStorage.getItem(MEANINGS_KEY) !== 'false';
  } catch {
    return true;
  }
}

/** "Show meanings": whether the English text shows under every verse. */
export interface MeaningsState {
  show: boolean;
  setShow: (show: boolean) => void;
}

/**
 * Store of the "Show meanings" setting, saved in localStorage. Exported so that any settings
 * view (e.g. the search settings popover) can add a row for it.
 */
export const useMeanings = create<MeaningsState>()((set) => ({
  show: loadShowMeanings(),
  setShow: (show) => {
    set({ show });
    try {
      localStorage.setItem(MEANINGS_KEY, String(show));
    } catch {
      // Private mode or quota: the setting lasts for this page only.
    }
  },
}));

/** Small "EN" switch for verse list headers: shows or hides the English text under verses. */
export function MeaningsToggle() {
  const show = useMeanings((s) => s.show);
  const setShow = useMeanings((s) => s.setShow);
  return (
    <button
      type="button"
      className="meanings-toggle"
      aria-label="Show meanings"
      aria-pressed={show}
      title={show ? 'Hide the English meanings' : 'Show the English meanings'}
      onClick={() => setShow(!show)}
    >
      EN
    </button>
  );
}
