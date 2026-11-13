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
  /** Search mix from 0 (exact only) to 1 (meaning only). Set by the search slider. */
  semanticWeight: number;
  setGalaxy: (galaxy: Galaxy) => void;
  select: (id: number | null) => void;
  hover: (id: number | null) => void;
  setQuery: (query: string) => void;
  setSemanticWeight: (weight: number) => void;
}

export const useGalaxyStore = create<GalaxyState>()((set) => ({
  galaxy: null,
  selectedId: null,
  hoveredId: null,
  query: '',
  semanticWeight: 0,
  setGalaxy: (galaxy) => set({ galaxy }),
  select: (selectedId) => set({ selectedId }),
  hover: (hoveredId) => set({ hoveredId }),
  setQuery: (query) => set({ query }),
  setSemanticWeight: (w) => set({ semanticWeight: Math.min(1, Math.max(0, w)) }),
}));
