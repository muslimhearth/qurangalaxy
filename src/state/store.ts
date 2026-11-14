import { create } from 'zustand';
import type { Galaxy, VerseKey } from '../data/types';

/** What the search field finds: roots (stars) or verses. */
export type SearchMode = 'roots' | 'verses';

/** A surah open in the reader, scrolled to one verse. Both numbers are 1-based. */
export interface ReaderPlace {
  surah: number;
  verse: number;
}

/** App-wide state shared by the 3D scene and the 2D UI. */
export interface GalaxyState {
  /** Loaded galaxy, or null while loading. */
  galaxy: Galaxy | null;
  /** Root the user picked (click, search, or URL). */
  selectedId: number | null;
  /** Root under the pointer. */
  hoveredId: number | null;
  /** Current search text. */
  query: string;
  /** Search mix from 0 (exact only) to 1 (meaning only). Set by the search slider. */
  semanticWeight: number;
  /** True after the user moved the view away from the selected root (shows "Back to …"). */
  awayFromSelection: boolean;
  /** Bumped to ask the camera to fly back to the selected root. */
  recenterTick: number;
  /** What the search field finds. */
  searchMode: SearchMode;
  /** Verse shown in the verse panel (verse search), or null. */
  openVerse: VerseKey | null;
  /** Surah shown in the full-surah reader, or null. */
  reader: ReaderPlace | null;
  setGalaxy: (galaxy: Galaxy) => void;
  select: (id: number | null) => void;
  hover: (id: number | null) => void;
  setQuery: (query: string) => void;
  setSemanticWeight: (weight: number) => void;
  setAwayFromSelection: (away: boolean) => void;
  recenter: () => void;
  setSearchMode: (mode: SearchMode) => void;
  setOpenVerse: (key: VerseKey | null) => void;
  setReader: (place: ReaderPlace | null) => void;
}

export const useGalaxyStore = create<GalaxyState>()((set) => ({
  galaxy: null,
  selectedId: null,
  hoveredId: null,
  query: '',
  semanticWeight: 0,
  awayFromSelection: false,
  recenterTick: 0,
  searchMode: 'roots',
  openVerse: null,
  reader: null,
  setGalaxy: (galaxy) => set({ galaxy }),
  // A new selection is framed by the camera, so it is not "away".
  select: (selectedId) => set({ selectedId, awayFromSelection: false }),
  hover: (hoveredId) => set({ hoveredId }),
  setQuery: (query) => set({ query }),
  setSemanticWeight: (w) => set({ semanticWeight: Math.min(1, Math.max(0, w)) }),
  setAwayFromSelection: (awayFromSelection) => set({ awayFromSelection }),
  recenter: () => set((s) => ({ recenterTick: s.recenterTick + 1, awayFromSelection: false })),
  setSearchMode: (searchMode) => set({ searchMode }),
  setOpenVerse: (openVerse) => set({ openVerse }),
  setReader: (reader) => set({ reader }),
}));
