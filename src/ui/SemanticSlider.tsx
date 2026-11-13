import { useGalaxyStore } from '../state/store';
import type { SemanticStatus } from '../semantic/useSemanticSearch';

/** Spoken value of the slider: "Exact only", "40% topic", "Topic only". */
export function sliderText(weight: number): string {
  if (weight <= 0) return 'Exact only';
  if (weight >= 1) return 'Topic only';
  return `${Math.round(weight * 100)}% topic`;
}

/** Range slider for the search mode: 0 = exact search, 1 = search by topic (meaning). */
export function SemanticSlider({ status, progress, error }: { status: SemanticStatus; progress: number; error?: string }) {
  const weight = useGalaxyStore((s) => s.semanticWeight);
  const setWeight = useGalaxyStore((s) => s.setSemanticWeight);
  return (
    <div className="semantic">
      <label htmlFor="semantic-weight">Exact ↔ Topic</label>
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
          <progress value={progress} max={1} aria-label="Topic model download" />
          Loading topic model… {Math.round(progress * 100)}%
        </span>
      )}
      {status === 'error' && (
        <span className="semantic-status error" role="alert">
          Topic search is unavailable: {error}
        </span>
      )}
    </div>
  );
}
