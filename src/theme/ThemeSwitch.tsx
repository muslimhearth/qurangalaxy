import { useTheme, type ThemePref } from './theme';

const OPTIONS: { pref: ThemePref; label: string }[] = [
  { pref: 'system', label: 'System' },
  { pref: 'light', label: 'Light' },
  { pref: 'dark', label: 'Dark' },
];

/** "Theme: System | Light | Dark" row for the settings popover. The galaxy stays dark in both. */
export function ThemeSwitch() {
  const pref = useTheme((s) => s.pref);
  const setPref = useTheme((s) => s.setPref);
  return (
    <div className="setting-row">
      <span className="setting-label">Theme</span>
      <div className="segmented" role="radiogroup" aria-label="Theme">
        {OPTIONS.map((o) => (
          <button key={o.pref} type="button" role="radio" aria-checked={pref === o.pref} onClick={() => setPref(o.pref)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
