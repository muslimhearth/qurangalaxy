import { useGalaxyStore } from '../state/store';
import type { SemanticStatus } from '../semantic/useSemanticSearch';

/** Spoken value of the slider: "Exact only", "40% meaning", "Meaning only". */
export function sliderText(weight: number): string {
  if (weight <= 0) return 'Exact only';
  if (weight >= 1) return 'Meaning only';
  return `${Math.round(weight * 100)}% meaning`;
}

/** Range slider under the search field: 0 = exact search, 1 = search by meaning. */
export function SemanticSlider({ status, progress, error }: { status: SemanticStatus; progress: number; error?: string }) {
  const weight = useGalaxyStore((s) => s.semanticWeight);
  const setWeight = useGalaxyStore((s) => s.setSemanticWeight);
  return (
    <div className="semantic">
      <label htmlFor="semantic-weight">Exact ↔ Meaning</label>
      <input
        id="semantic-weight"
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={weight}
        aria-valuetext={sliderText(weight)}
        onChange={(e) => setWeight(Number(e.target.value))}
      />
      {status === 'loading' && (
        <span className="semantic-status" aria-live="polite">
          <progress value={progress} max={1} aria-label="Meaning model download" />
          Loading meaning model… {Math.round(progress * 100)}%
        </span>
      )}
      {status === 'error' && (
        <span className="semantic-status error" role="alert">
          Meaning search is unavailable: {error}
        </span>
      )}
    </div>
  );
}
