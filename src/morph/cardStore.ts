import { create } from 'zustand';
import type { VerseKey } from '../data/types';

/** The word the card shows: verse and 1-based Tanzil word position. */
export interface CardWord {
  verse: VerseKey;
  pos: number;
}

/** State of the word card: the open word and the element that was tapped. */
interface WordCardState {
  word: CardWord | null;
  /** The tapped word element: the desktop popover points at it, and focus returns to it. */
  anchor: HTMLElement | null;
  /** Opens the card for a word (or switches the open card to it). */
  show: (word: CardWord, anchor: HTMLElement | null) => void;
  /** Closes the card. */
  close: () => void;
}

/** The word card store. Kept apart from the main store: the card is a passing view, not app state. */
export const useWordCard = create<WordCardState>((set) => ({
  word: null,
  anchor: null,
  show: (word, anchor) => set({ word, anchor }),
  close: () => set({ word: null, anchor: null }),
}));
