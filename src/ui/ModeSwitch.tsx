import { useGalaxyStore, type SearchMode } from '../state/store';

const MODES: { mode: SearchMode; label: string }[] = [
  { mode: 'roots', label: 'Roots' },
  { mode: 'verses', label: 'Verses' },
];

/** Two-way "Roots | Verses" switch in the search field: what the search finds. */
export function ModeSwitch({ onSwitch }: { onSwitch?: (mode: SearchMode) => void }) {
  const mode = useGalaxyStore((s) => s.searchMode);
  const setMode = useGalaxyStore((s) => s.setSearchMode);
  return (
    <div className="mode-switch" role="radiogroup" aria-label="Search for">
      {MODES.map((m) => (
        <button
          key={m.mode}
          type="button"
          role="radio"
          aria-checked={mode === m.mode}
          // Keep focus (and the phone keyboard) in the search field.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setMode(m.mode);
            onSwitch?.(m.mode);
          }}
        >
          <span>{m.label}</span>
        </button>
      ))}
    </div>
  );
}
