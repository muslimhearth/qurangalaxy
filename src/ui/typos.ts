import { create } from 'zustand';

/** localStorage key of the "Typo tolerance" setting. */
export const TYPOS_KEY = 'qrg.typos.v1';

/** Reads the saved setting: on unless "false" is saved. Blocked storage counts as on. */
export function loadTypos(): boolean {
  try {
    return localStorage.getItem(TYPOS_KEY) !== 'false';
  } catch {
    return true;
  }
}

/** "Typo tolerance": whether verse search also finds words with small spelling mistakes. */
export interface TyposState {
  on: boolean;
  setOn: (on: boolean) => void;
}

/** Store of the "Typo tolerance" setting (Verses mode), saved in localStorage. */
export const useTypos = create<TyposState>()((set) => ({
  on: loadTypos(),
  setOn: (on) => {
    set({ on });
    try {
      localStorage.setItem(TYPOS_KEY, String(on));
    } catch {
      // Private mode or quota: the setting lasts for this page only.
    }
  },
}));
