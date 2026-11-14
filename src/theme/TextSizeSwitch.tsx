import { TEXT_SIZES, useTextSize } from './textSize';

/** Spoken names of the sizes, for screen readers. */
const NAMES = { S: 'Small', M: 'Medium', L: 'Large', XL: 'Extra large' } as const;

/** "Text size: S | M | L | XL" row for the settings popover. Scales the verse text. */
export function TextSizeSwitch() {
  const size = useTextSize((s) => s.size);
  const setSize = useTextSize((s) => s.setSize);
  return (
    <div className="setting-row">
      <span className="setting-label">Text size</span>
      <div className="segmented" role="radiogroup" aria-label="Text size">
        {TEXT_SIZES.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={size === s}
            aria-label={NAMES[s]}
            title={NAMES[s]}
            onClick={() => setSize(s)}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
