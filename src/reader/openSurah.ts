import { create } from 'zustand';
import { useGalaxyStore } from '../state/store';

/**
 * The reader place (as "s:v") opened at the start of a surah: the reader does not mark that verse,
 * because the user did not pick it. Null when the open verse is one the user picked.
 */
export const useUnmarked = create<{ key: string | null }>(() => ({ key: null }));

/** Opens surah `n` in the reader at verse 1, without marking verse 1 (surah name search, next/previous). */
export function openSurah(n: number): void {
  useUnmarked.setState({ key: `${n}:1` });
  useGalaxyStore.getState().setReader({ surah: n, verse: 1 });
}
