import { create } from 'zustand';
import type { VerseKey } from '../data/types';

/** A request to scroll the root panel to one verse and flash it. */
export interface VerseFocusRequest {
  key: VerseKey;
  /** Grows with each request, so asking twice for the same verse flashes it again. */
  tick: number;
}

/** Verse focus requests from other views (e.g. a tap on the Mushaf mosaic) to the verse list. */
export interface VerseFocusState {
  request: VerseFocusRequest | null;
  /** Asks the verse list to show, scroll to and flash verse `key`. */
  focusVerse: (key: VerseKey) => void;
}

/** Store for verse focus requests. */
export const useVerseFocus = create<VerseFocusState>()((set) => ({
  request: null,
  focusVerse: (key) => set((s) => ({ request: { key, tick: (s.request?.tick ?? 0) + 1 } })),
}));
