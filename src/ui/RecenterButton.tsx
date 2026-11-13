import { useGalaxyStore } from '../state/store';

/**
 * "Back to رحم": shown after the user moves the view away from the selected root,
 * like the re-center button in map apps. A click flies the camera back.
 */
export function RecenterButton() {
  const root = useGalaxyStore((s) => (s.selectedId === null ? undefined : s.galaxy?.roots[s.selectedId]));
  const away = useGalaxyStore((s) => s.awayFromSelection);
  const recenter = useGalaxyStore((s) => s.recenter);
  if (!root || !away) return null;
  return (
    <button type="button" className="recenter panel" aria-label={`Back to ${root.ar}`} onClick={recenter}>
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <circle cx="8" cy="8" r="1.8" fill="currentColor" />
        <path d="M8 1v2.2M8 12.8V15M1 8h2.2M12.8 8H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span lang="ar" dir="rtl">
        {root.ar}
      </span>
    </button>
  );
}
