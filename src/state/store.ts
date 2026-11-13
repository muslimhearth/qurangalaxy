import { create } from 'zustand';
import type { Galaxy } from '../data/types';

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
  setGalaxy: (galaxy: Galaxy) => void;
  select: (id: number | null) => void;
  hover: (id: number | null) => void;
  setQuery: (query: string) => void;
}

export const useGalaxyStore = create<GalaxyState>()((set) => ({
  galaxy: null,
  selectedId: null,
  hoveredId: null,
  query: '',
  setGalaxy: (galaxy) => set({ galaxy }),
  select: (selectedId) => set({ selectedId }),
  hover: (hoveredId) => set({ hoveredId }),
  setQuery: (query) => set({ query }),
}));
