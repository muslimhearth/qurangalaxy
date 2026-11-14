import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { loadOccurrences } from '../data/load';
import { BookmarkButton } from '../bookmarks/BookmarkButton';
import type { Occurrences, VerseKey } from '../data/types';
import { useGalaxyStore } from '../state/store';
import { verseWords } from '../ui/helpers';
import { VerseWords } from '../morph/VerseWords';
import { loadMorphTags, loadSurahMorph } from '../morph/word';
import { MeaningsToggle, useMeanings } from '../ui/meanings';
import { useVerseTexts } from '../ui/useVerseTexts';
import { useVerseFocus } from '../ui/verseFocus';
import { openSurah, useUnmarked } from './openSurah';
import { surahAt, surahVerseKeys } from './surahs';
import { growWindow, initialWindow, isFull, type VerseWindow } from './verseWindow';

/** Loads occurrences.json (shared, cached) once `enabled` turns true; null until then or on error. */
function useOccurrences(enabled: boolean): Occurrences | null {
  const [occ, setOcc] = useState<Occurrences | null>(null);
  useEffect(() => {
    if (!enabled || occ) return;
    let active = true;
    loadOccurrences().then(
      (o) => active && setOcc(o),
      () => {}, // The verses still show, only without gold words.
    );
    return () => {
      active = false;
    };
  }, [enabled, occ]);
  return occ;
}

/**
 * The verses to render for `count` verses opened at 1-based `verse`: a small window first, then one
 * chunk more per idle moment (once `ready`) until the whole surah is there.
 */
function useVerseWindow(count: number, verse: number, id: string, ready: boolean): VerseWindow {
  const [win, setWin] = useState(() => ({ id, ...initialWindow(count, verse - 1) }));
  let current = win;
  if (win.id !== id) {
    // A new place: start over (state set during render, so the old window never paints).
    current = { id, ...initialWindow(count, verse - 1) };
    setWin(current);
  }
  const full = isFull(current, count);
  useEffect(() => {
    if (!ready || full) return;
    const grow = () => setWin((w) => (w.id === id ? { id, ...growWindow(w, count) } : w));
    if (typeof requestIdleCallback === 'function') {
      const handle = requestIdleCallback(grow, { timeout: 300 });
      return () => cancelIdleCallback(handle);
    }
    const timer = setTimeout(grow, 30);
    return () => clearTimeout(timer);
  }, [ready, full, current, id, count]);
  return current;
}

/** Small chevron icon; `dir` is where it points. */
const Chevron = ({ dir }: { dir: 'up' | 'down' | 'left' | 'right' }) => {
  const d = { up: 'M4 10l4-4 4 4', down: 'M4 6l4 4 4-4', left: 'M10 4L6 8l4 4', right: 'M6 4l4 4-4 4' }[dir];
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/**
 * Full-surah reader. Takes the panel's place (bottom sheet on phones) while `reader` is set in
 * the store: header with the surah number and names, every verse (Arabic, key, optional English),
 * scrolled to and marking the open verse. The selected root's words stay gold. Back (or Escape)
 * closes it and shows what was open before.
 */
export function SurahReader() {
  const place = useGalaxyStore((s) => s.reader);
  const setReader = useGalaxyStore((s) => s.setReader);
  const selectedId = useGalaxyStore((s) => s.selectedId);
  const showMeanings = useMeanings((s) => s.show);
  const focusVerse = useVerseFocus((s) => s.focusVerse);
  const open = place !== null;
  const verses = useVerseTexts(open);
  const occurrences = useOccurrences(open && selectedId !== null);
  const body = useRef<HTMLDivElement>(null);
  // Phones: the sheet can shrink to its header (kept per surah).
  const [collapsedSurah, setCollapsedSurah] = useState<number | null>(null);

  const surah = place?.surah ?? 0;
  const keys = useMemo(() => surahVerseKeys(surah), [surah]);
  // Word positions of the selected root in this surah's verses.
  const gold = useMemo(() => {
    const list = selectedId === null ? undefined : occurrences?.[selectedId];
    const prefix = `${surah}:`;
    return new Map((list ?? []).filter((o) => o.v.startsWith(prefix)).map((o) => [o.v, o.w]));
  }, [occurrences, selectedId, surah]);

  const close = () => {
    if (!place) return;
    setReader(null);
    // The root panel's verse list scrolls back to (and flashes) the verse the reader showed.
    focusVerse(`${place.surah}:${place.verse}`);
  };
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Fetch the surah's word card data ahead of the first tap (once the verses are in).
  useEffect(() => {
    if (!open || verses === null || surah < 1) return;
    const timer = setTimeout(() => {
      Promise.all([loadSurahMorph(surah), loadMorphTags()]).catch(() => {}); // A tap retries.
    }, 500);
    return () => clearTimeout(timer);
  }, [open, verses, surah]);

  const ready = verses !== null;
  const verse = place?.verse ?? 0;
  const currentKey: VerseKey = `${surah}:${verse}`;
  // Previous/next surah (and a surah name search) opens verse 1 without marking it: only a verse
  // the user opened is marked. Any other place (a verse key, the URL) clears this again.
  const unmarked = useUnmarked((s) => s.key);
  useEffect(() => {
    if (unmarked !== null && place && unmarked !== currentKey) useUnmarked.setState({ key: null });
  }, [unmarked, place, currentKey]);
  const goToSurah = openSurah;
  const win = useVerseWindow(keys.length, verse, `${surah}:${verse}`, ready);

  // Verses added above keep the reading position: move the scroll by how far the first verse
  // that was rendered before has moved down (the CSS turns the browser's own anchoring off).
  const anchor = useRef<{ key: string; top: number } | null>(null);
  useLayoutEffect(() => {
    const el = body.current;
    if (!el) return;
    const before = anchor.current;
    const moved = before && el.querySelector<HTMLElement>(`[data-verse="${before.key}"]`);
    if (before && moved) el.scrollTop += moved.offsetTop - before.top;
    const first = el.querySelector<HTMLElement>('.reader-verses > li');
    anchor.current = first ? { key: first.dataset.verse!, top: first.offsetTop } : null;
  }, [win.start, ready, surah]);

  // Scroll to the open verse once the verses are there (and again when the place changes).
  useEffect(() => {
    const el = body.current;
    if (!ready || !el) return;
    if (verse <= 1) {
      el.scrollTop = 0;
      return;
    }
    el.querySelector(`[data-verse="${surah}:${verse}"]`)?.scrollIntoView?.({ block: 'center' });
  }, [ready, surah, verse]);

  if (!place) return null;
  const meta = surahAt(surah);
  const prev = surahAt(surah - 1);
  const next = surahAt(surah + 1);
  const collapsed = collapsedSurah === surah;

  return (
    // Same frame as the root panel (side panel / bottom sheet), so it shares its styles.
    <aside className={`root-panel reader-panel panel${collapsed ? ' collapsed' : ''}`} aria-label="Surah reader">
      <header
        className="root-head"
        onClick={(e) => {
          if (collapsed && !(e.target as HTMLElement).closest('button')) setCollapsedSurah(null);
        }}
      >
        <button type="button" className="reader-back" aria-label="Close the reader" title="Back" onClick={close}>
          <Chevron dir="left" />
        </button>
        <div className="reader-title">
          <h2>
            <span className="reader-number">{surah}</span>
            <span className="reader-ar" lang="ar" dir="rtl">
              {meta?.ar}
            </span>
          </h2>
          <p className="root-stats">
            {meta?.tr} · {meta?.en} · {meta?.verses} verses
          </p>
        </div>
        <div className="head-buttons">
          <MeaningsToggle />
          <button
            type="button"
            className="sheet-size"
            aria-label={collapsed ? 'Expand the reader' : 'Minimize the reader'}
            onClick={() => setCollapsedSurah(collapsed ? null : surah)}
          >
            <Chevron dir={collapsed ? 'up' : 'down'} />
          </button>
        </div>
      </header>
      <nav className="reader-nav" aria-label="Other surahs" hidden={collapsed}>
        {prev && (
          <button
            type="button"
            aria-label={`Previous surah: ${surah - 1} ${prev.tr}`}
            onClick={() => goToSurah(surah - 1)}
          >
            <Chevron dir="left" /> {surah - 1} {prev.tr}
          </button>
        )}
        {next && (
          <button
            type="button"
            className="next"
            aria-label={`Next surah: ${surah + 1} ${next.tr}`}
            onClick={() => goToSurah(surah + 1)}
          >
            {surah + 1} {next.tr} <Chevron dir="right" />
          </button>
        )}
      </nav>
      <div className="root-body reader-body" hidden={collapsed} ref={body}>
        {!verses && <p className="muted">Loading the surah…</p>}
        {verses && (
          <ol className="verse-list reader-verses">
            {keys.slice(win.start, win.end).map((key) => {
              const v = verses[key];
              if (!v) return null;
              const current = key === currentKey && unmarked !== key;
              return (
                <li
                  key={key}
                  className={current ? 'verse current' : 'verse'}
                  data-verse={key}
                  aria-current={current ? 'true' : undefined}
                >
                  <div className="verse-head">
                    <span className="verse-key">{key}</span>
                    <BookmarkButton target={{ verse: key }} className="verse-bookmark" />
                  </div>
                  <p className="verse-ar" dir="rtl" lang="ar">
                    <VerseWords verseKey={key} words={verseWords(v.ar, gold.get(key) ?? [])} />
                  </p>
                  {showMeanings && <p className="verse-en">{v.en}</p>}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </aside>
  );
}
