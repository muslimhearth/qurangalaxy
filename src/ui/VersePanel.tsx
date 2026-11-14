import { useEffect, useState } from 'react';
import { loadOccurrences } from '../data/load';
import type { Occurrences } from '../data/types';
import { useGalaxyStore } from '../state/store';
import { rootsInVerse } from '../verses/verseRoots';
import { useNewTabGesture } from '../tabs/useNewTabGesture';
import { TranslitText } from './TranslitText';
import { useTranslit } from './useTranslit';
import { useVerseTexts } from './useVerseTexts';

/** Loads occurrences.json (shared, cached); null until loaded or on error. */
function useOccurrences(): Occurrences | null {
  const [occ, setOcc] = useState<Occurrences | null>(null);
  useEffect(() => {
    let active = true;
    loadOccurrences().then(
      (o) => active && setOcc(o),
      () => {}, // The verse still shows; only the root chips are missing.
    );
    return () => {
      active = false;
    };
  }, []);
  return occ;
}

/**
 * Side panel (bottom sheet on phones) for the open verse: Arabic, transliteration, English and
 * the roots it uses. A root chip selects that root in the galaxy and shows its panel.
 */
export function VersePanel() {
  const key = useGalaxyStore((s) => s.openVerse);
  const galaxy = useGalaxyStore((s) => s.galaxy);
  const setOpenVerse = useGalaxyStore((s) => s.setOpenVerse);
  const select = useGalaxyStore((s) => s.select);
  const setQuery = useGalaxyStore((s) => s.setQuery);
  const verses = useVerseTexts(key !== null);
  const { translit } = useTranslit(key !== null);
  const occurrences = useOccurrences();
  const newTab = useNewTabGesture();
  // Phones: the sheet can shrink to its header (kept per verse, so a new verse opens full).
  const [collapsedKey, setCollapsedKey] = useState<string | null>(null);
  const collapsed = key !== null && collapsedKey === key;

  useEffect(() => {
    if (!key) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenVerse(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [key, setOpenVerse]);

  if (!key) return null;
  const verse = verses?.[key];
  const roots = occurrences && galaxy ? rootsInVerse(occurrences, key).map((id) => galaxy.roots[id]!) : [];
  const [surah, ayah] = key.split(':');

  const openRoot = (id: number) => {
    setOpenVerse(null);
    setQuery(''); // Leave the verse results so the root panel shows.
    select(id);
  };

  return (
    // Same frame as the root panel (side panel / bottom sheet), so it shares its styles.
    <aside className={`root-panel verse-panel panel${collapsed ? ' collapsed' : ''}`} aria-label="Verse details">
      <header
        className="root-head"
        onClick={(e) => {
          if (collapsed && !(e.target as HTMLElement).closest('button')) setCollapsedKey(null);
        }}
      >
        <div>
          <h2 className="verse-title">{key}</h2>
          <p className="root-stats">
            Surah {surah}, verse {ayah}
          </p>
        </div>
        <div className="head-buttons">
          <button
            type="button"
            className="sheet-size"
            aria-label={collapsed ? 'Expand verse details' : 'Minimize verse details'}
            onClick={() => setCollapsedKey(collapsed ? null : key)}
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path
                d={collapsed ? 'M4 10l4-4 4 4' : 'M4 6l4 4 4-4'}
                stroke="currentColor"
                strokeWidth="1.8"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button type="button" className="close" aria-label="Close verse details" onClick={() => setOpenVerse(null)}>
            ×
          </button>
        </div>
      </header>
      <div className="root-body" hidden={collapsed}>
        {!verses && <p className="muted">Loading verse…</p>}
        {verse && (
          <>
            <p className="verse-ar verse-panel-ar" dir="rtl" lang="ar">
              {verse.ar}
            </p>
            {translit?.[key] && (
              <p className="verse-tr">
                <TranslitText raw={translit[key]} />
              </p>
            )}
            <p className="verse-en">{verse.en}</p>
          </>
        )}
        {roots.length > 0 && (
          <section>
            <h3>Roots in this verse</h3>
            <ul className="chips" aria-label="Roots in this verse">
              {roots.map((r) => (
                <li key={r.id}>
                  <button type="button" className="chip chip-link" {...newTab(r.id, () => openRoot(r.id))}>
                    <span lang="ar" dir="rtl">
                      {r.ar}
                    </span>
                    {r.en[0] && <span className="chip-en">{r.en[0]}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </aside>
  );
}
