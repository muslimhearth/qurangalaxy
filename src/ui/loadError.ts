import { create } from 'zustand';

/** UI-only state: the startup load error, if any. Kept out of the shared store on purpose. */
export interface LoadErrorState {
  /** Message of the failed galaxy load, or null. */
  error: string | null;
  setError: (error: string | null) => void;
}

/** Small store for the startup load error, shown by the overlay. */
export const useLoadError = create<LoadErrorState>()((set) => ({
  error: null,
  setError: (error) => set({ error }),
}));
