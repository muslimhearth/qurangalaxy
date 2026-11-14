import { create } from 'zustand';

/** The user's theme choice. "system" follows the device's light/dark setting. */
export type ThemePref = 'system' | 'light' | 'dark';
/** The theme in use. */
export type Theme = 'light' | 'dark';

/** localStorage key of the theme choice. `public/theme-init.js` reads the same key. */
export const THEME_KEY = 'qrg.theme.v1';

/** Browser UI color (`<meta name="theme-color">`) per theme. Same values in `public/theme-init.js`. */
export const THEME_COLORS: Record<Theme, string> = { dark: '#04050b', light: '#f3ede0' };

const PREFS: readonly ThemePref[] = ['system', 'light', 'dark'];
const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Reads the saved choice. Unknown values and blocked storage count as "system". */
export function loadThemePref(): ThemePref {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return PREFS.includes(saved as ThemePref) ? (saved as ThemePref) : 'system';
  } catch {
    return 'system';
  }
}

/** The theme for a choice; `systemDark` is the device setting. */
export const resolveTheme = (pref: ThemePref, systemDark: boolean): Theme =>
  pref === 'system' ? (systemDark ? 'dark' : 'light') : pref;

/** Sets `data-theme` on `<html>` (the CSS reads it) and the browser UI color. */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
}

/** Theme setting store. */
export interface ThemeState {
  pref: ThemePref;
  setPref: (pref: ThemePref) => void;
}

/** Store of the theme choice, saved in localStorage. `startTheme` applies it to the page. */
export const useTheme = create<ThemeState>()((set) => ({
  pref: loadThemePref(),
  setPref: (pref) => {
    set({ pref });
    try {
      localStorage.setItem(THEME_KEY, pref);
    } catch {
      // Private mode or quota: the choice lasts for this page only.
    }
  },
}));

/**
 * Applies the theme now and keeps it applied: on a new choice and, for "system", on a change of
 * the device setting. Returns a function that stops both listeners.
 */
export function startTheme(): () => void {
  const query = typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY) : null;
  // No matchMedia (old browser): treat the device as dark, the app's original look.
  const update = () => applyTheme(resolveTheme(useTheme.getState().pref, query?.matches ?? true));
  update();
  const unsubscribe = useTheme.subscribe(update);
  query?.addEventListener('change', update);
  return () => {
    unsubscribe();
    query?.removeEventListener('change', update);
  };
}
