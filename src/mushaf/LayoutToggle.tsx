/** The two ways to see the Quran: the 3D root galaxy or the 2D Mushaf mosaic. */
export type Layout = 'galaxy' | 'mushaf';

/** Props for `LayoutToggle`. */
export interface LayoutToggleProps {
  value: Layout;
  onChange: (layout: Layout) => void;
}

const OPTIONS: { value: Layout; label: string }[] = [
  { value: 'galaxy', label: 'Galaxy' },
  { value: 'mushaf', label: 'Mushaf' },
];

/** Segmented "Galaxy | Mushaf" control. Each segment is a toggle button with a 44 px touch target. */
export function LayoutToggle({ value, onChange }: LayoutToggleProps) {
  return (
    <div className="mushaf-toggle panel" role="group" aria-label="Layout">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => o.value !== value && onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
