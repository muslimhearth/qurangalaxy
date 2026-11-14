import { useGalaxyStore } from '../state/store';

/** Suggested roots for an empty mosaic: common, easy to grasp, spread across the Quran. */
const SUGGESTIONS = [
  { ar: 'رحم', en: 'mercy' },
  { ar: 'نور', en: 'light' },
  { ar: 'صبر', en: 'patience' },
  { ar: 'علم', en: 'knowledge' },
];

/**
 * Box over the empty mosaic (no root selected): a short line and a few root chips.
 * A tap selects that root, which lights its verses and hides the box.
 */
export function MushafPrompt() {
  const galaxy = useGalaxyStore((s) => s.galaxy);
  const selectedId = useGalaxyStore((s) => s.selectedId);
  const select = useGalaxyStore((s) => s.select);
  if (!galaxy || selectedId !== null) return null;
  const chips = SUGGESTIONS.map((c) => ({ ...c, id: galaxy.roots.findIndex((r) => r.ar === c.ar) })).filter((c) => c.id >= 0);
  return (
    <div className="mushaf-prompt panel">
      <p>Pick a root to light its verses</p>
      <div className="mushaf-prompt-chips">
        {chips.map((c) => (
          <button key={c.ar} type="button" className="chip" onClick={() => select(c.id)}>
            <span lang="ar" dir="rtl">
              {c.ar}
            </span>{' '}
            {c.en}
          </button>
        ))}
      </div>
    </div>
  );
}
