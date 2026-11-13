import type { ReactElement } from 'react';

/** The two ways to see the Quran: the 3D root galaxy or the 2D Mushaf mosaic. */
export type Layout = 'galaxy' | 'mushaf';

/** Props for `LayoutToggle`. */
export interface LayoutToggleProps {
  value: Layout;
  onChange: (layout: Layout) => void;
}

/** Small icons: a sparkle with stars for the galaxy, a dot grid for the Mushaf mosaic. */
const ICONS: Record<Layout, ReactElement> = {
  galaxy: (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="currentColor">
      <path d="M8 2.5 9.4 6.6 13.5 8 9.4 9.4 8 13.5 6.6 9.4 2.5 8 6.6 6.6Z" />
      <circle cx="15" cy="14.5" r="1.6" />
      <circle cx="4.5" cy="16" r="1.1" />
      <circle cx="15.5" cy="4" r="1" />
    </svg>
  ),
  mushaf: (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="currentColor">
      {[3, 8, 13].flatMap((y) => [3, 8, 13].map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" rx="1" />))}
    </svg>
  ),
};

const OPTIONS: { value: Layout; label: string }[] = [
  { value: 'galaxy', label: 'Galaxy' },
  { value: 'mushaf', label: 'Mushaf' },
];

/**
 * Segmented "Galaxy | Mushaf" control. Each segment is a toggle button with a 44 px touch target.
 * On phones CSS shows only the other layout's icon, beside the search field.
 */
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
          {ICONS[o.value]}
          <span className="mushaf-toggle-label">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
