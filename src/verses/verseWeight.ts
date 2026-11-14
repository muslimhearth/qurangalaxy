/** Exact ↔ semantic mix for verse search, apart from the root search mix in the main store. */
import { create } from 'zustand';

/** Default verse search mix: hybrid, so meaning phrases work without touching the slider. */
export const DEFAULT_VERSE_WEIGHT = 0.5;

/** Verse search mix state. */
export interface VerseWeightState {
  /** 0 = exact words only, 1 = meaning only. */
  weight: number;
  setWeight: (w: number) => void;
}

/** Store for the verse search mix. */
export const useVerseWeight = create<VerseWeightState>()((set) => ({
  weight: DEFAULT_VERSE_WEIGHT,
  setWeight: (w) => set({ weight: Math.min(1, Math.max(0, w)) }),
}));
