import { useEffect, useState } from 'react';
import { loadTranslit, type Translit } from '../verses/translit';

/** Load state of the transliteration: null while loading; `failed` means search goes on without it. */
export interface TranslitState {
  translit: Translit | null;
  failed: boolean;
}

/** Loads translit.json (shared, cached) once `enabled` turns true. */
export function useTranslit(enabled: boolean): TranslitState {
  const [state, setState] = useState<TranslitState>({ translit: null, failed: false });
  useEffect(() => {
    if (!enabled || state.translit) return;
    let active = true;
    loadTranslit().then(
      (translit) => active && setState({ translit, failed: false }),
      () => active && setState({ translit: null, failed: true }),
    );
    return () => {
      active = false;
    };
  }, [enabled, state.translit]);
  return state;
}
