import { useGalaxyStore } from '../state/store';
import type { SemanticStatus } from '../semantic/useSemanticSearch';

/** How the search matches: exact words, a mix, or meaning (semantic) only. */
export type MatchMode = 'exact' | 'hybrid' | 'meaning';

/** Search mix (semantic share) set by each mode. */
export const MATCH_WEIGHTS: Record<MatchMode, number> = { exact: 0, hybrid: 0.5, meaning: 1 };

const MODES: { mode: MatchMode; label: string }[] = [
  { mode: 'exact', label: 'Exact' },
  { mode: 'hybrid', label: 'Hybrid' },
  { mode: 'meaning', label: 'Meaning' },
];

/** Mode of a search mix. Any mix between the ends (e.g. an old slider value) counts as hybrid. */
export function matchMode(weight: number): MatchMode {
  if (weight <= 0) return 'exact';
  return weight >= 1 ? 'meaning' : 'hybrid';
}

/**
 * Three-way "Exact | Hybrid | Meaning" switch in the search settings. It writes the mix
 * (0, 0.5 or 1) to the root search store, or to `onWeight` (verse search has its own mix).
 * Shows the meaning model's download progress or load error under it.
 */
export function MatchSwitch({
  status,
  progress,
  error,
  weight: ownWeight,
  onWeight,
}: {
  status: SemanticStatus;
  progress: number;
  error?: string;
  /** Mix to show instead of the root search mix in the store. */
  weight?: number;
  onWeight?: (w: number) => void;
}) {
  const storeWeight = useGalaxyStore((s) => s.semanticWeight);
  const setStoreWeight = useGalaxyStore((s) => s.setSemanticWeight);
  const current = matchMode(ownWeight ?? storeWeight);
  const setWeight = onWeight ?? setStoreWeight;
  return (
    <>
      <div className="setting-row">
        <span className="setting-label">
          Match
          <small>Exact words, or by meaning</small>
        </span>
        <div className="segmented" role="radiogroup" aria-label="Search mode">
          {MODES.map((m) => (
            <button
              key={m.mode}
              type="button"
              role="radio"
              aria-checked={current === m.mode}
              onClick={() => setWeight(MATCH_WEIGHTS[m.mode])}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      {status === 'loading' && (
        <p className="setting-status" aria-live="polite">
          <progress value={progress} max={1} aria-label="Meaning model download" />
          Loading meaning model… {Math.round(progress * 100)}%
        </p>
      )}
      {status === 'error' && (
        <p className="setting-status error" role="alert">
          Meaning search is unavailable: {error}
        </p>
      )}
    </>
  );
}
