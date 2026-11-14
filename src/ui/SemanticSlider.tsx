import { useGalaxyStore } from '../state/store';
import type { SemanticStatus } from '../semantic/useSemanticSearch';

/** Spoken value of the slider: "Exact only", "Hybrid, 40% semantic", "Semantic only". */
export function sliderText(weight: number): string {
  if (weight <= 0) return 'Exact only';
  if (weight >= 1) return 'Semantic only';
  return `Hybrid, ${Math.round(weight * 100)}% semantic`;
}

/**
 * Search-mode slider: 0 = exact search, 1 = semantic search (by meaning), anything between
 * is a hybrid that blends both scores. The share of semantic shows under the thumb.
 */
export function SemanticSlider({
  status,
  progress,
  error,
  weight: ownWeight,
  onWeight,
}: {
  status: SemanticStatus;
  progress: number;
  error?: string;
  /** Mix to show instead of the root search mix in the store (verse search has its own). */
  weight?: number;
  onWeight?: (w: number) => void;
}) {
  const storeWeight = useGalaxyStore((s) => s.semanticWeight);
  const setStoreWeight = useGalaxyStore((s) => s.setSemanticWeight);
  const weight = ownWeight ?? storeWeight;
  const setWeight = onWeight ?? setStoreWeight;
  return (
    <div className="semantic">
      <div className="semantic-ends" aria-hidden="true">
        <span>Exact</span>
        <span>Semantic</span>
      </div>
      <input
        id="semantic-weight"
        aria-label="Search mode, exact to semantic"
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={weight}
        aria-valuetext={sliderText(weight)}
        onChange={(e) => setWeight(Number(e.target.value))}
      />
      {/* Under the thumb: the semantic share, e.g. 58%. */}
      <div className="semantic-value" aria-hidden="true">
        <span style={{ left: `${weight * 100}%` }}>{Math.round(weight * 100)}%</span>
      </div>
      {status === 'loading' && (
        <span className="semantic-status" aria-live="polite">
          <progress value={progress} max={1} aria-label="Semantic model download" />
          Loading semantic model… {Math.round(progress * 100)}%
        </span>
      )}
      {status === 'error' && (
        <span className="semantic-status error" role="alert">
          Semantic search is unavailable: {error}
        </span>
      )}
    </div>
  );
}
