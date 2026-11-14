import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Occurrence, VerseKey, Verses } from '../data/types';
import { VerseKeyButton } from '../reader/VerseKeyButton';
import { BookmarkButton } from '../bookmarks/BookmarkButton';
import { verseWords } from './helpers';
import { VerseWords } from '../morph/VerseWords';
import { useMeanings } from './meanings';
import { useVerseFocus, type VerseFocusRequest } from './verseFocus';

/** How long a focused verse stays highlighted, in ms. */
const FLASH_MS = 1800;

/** Verses shown at first and added per "show more" click. */
export const VERSE_PAGE = 30;

/** Props for `VerseList`. */
export interface VerseListProps {
  occurrences: Occurrence[];
  verses: Verses;
  /** Occurrences of a second root: its words get `<mark class="alt">` (shared-verse view). */
  others?: Occurrence[];
  /** Extra buttons for one verse (e.g. a bookmark star), shown in the verse head after the key. */
  actions?: (key: VerseKey) => ReactNode;
}

/** Verses that use a root: key, Arabic with the root's words highlighted, English below. */
export function VerseList({ occurrences, verses, others, actions }: VerseListProps) {
  const showMeanings = useMeanings((s) => s.show);
  const [shown, setShown] = useState(VERSE_PAGE);
  const otherWords = useMemo(() => new Map(others?.map((o) => [o.v, o.w])), [others]);
  const visible = occurrences.slice(0, shown);
  const listRef = useRef<HTMLOListElement>(null);
  const flash = useFocusedVerse(occurrences, setShown);

  // Scroll the focused verse into view once it is rendered.
  useEffect(() => {
    if (!flash) return;
    const el = listRef.current?.querySelector(`[data-verse="${flash.key}"]`);
    if (!el) return;
    // Glide to near verses; jump to far ones (a long smooth scroll over a list that just grew
    // can be cut short while the new verses lay out).
    const near = Math.abs(el.getBoundingClientRect().top - window.innerHeight / 2) < window.innerHeight;
    const smooth = near && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView?.({ block: 'center', behavior: smooth ? 'smooth' : 'auto' });
  }, [flash]);

  return (
    <>
      <ol className="verse-list" ref={listRef}>
        {visible.map((occ) => {
          const verse = verses[occ.v];
          if (!verse) return null;
          return (
            <li key={occ.v} className={flash?.key === occ.v ? 'verse flash' : 'verse'} data-verse={occ.v}>
              <div className="verse-head">
                <VerseKeyButton verseKey={occ.v} />
                <BookmarkButton target={{ verse: occ.v }} className="verse-bookmark" />
                {actions?.(occ.v)}
              </div>
              <p className="verse-ar" dir="rtl" lang="ar">
                <VerseWords verseKey={occ.v} words={verseWords(verse.ar, occ.w, otherWords.get(occ.v))} />
              </p>
              {showMeanings && <p className="verse-en">{verse.en}</p>}
            </li>
          );
        })}
      </ol>
      {shown < occurrences.length && (
        <button type="button" className="show-more" onClick={() => setShown((n) => n + VERSE_PAGE)}>
          Show more ({occurrences.length - shown} left)
        </button>
      )}
    </>
  );
}

/**
 * Follows verse focus requests made after mount: shows enough verses to include the requested
 * one and returns it while it should flash.
 */
function useFocusedVerse(occurrences: Occurrence[], setShown: (fn: (n: number) => number) => void) {
  const request = useVerseFocus((s) => s.request);
  // Requests made before this list existed belong to an earlier root.
  const seenTick = useRef(request?.tick ?? 0);
  const [flash, setFlash] = useState<VerseFocusRequest | null>(null);

  useEffect(() => {
    if (!request || request.tick <= seenTick.current) return;
    seenTick.current = request.tick;
    const index = occurrences.findIndex((o) => o.v === request.key);
    if (index < 0) return;
    // Grow the list in whole pages, as "show more" does.
    setShown((n) => Math.max(n, Math.ceil((index + 1) / VERSE_PAGE) * VERSE_PAGE));
    setFlash(request);
    const timer = setTimeout(() => setFlash(null), FLASH_MS);
    return () => clearTimeout(timer);
  }, [request, occurrences, setShown]);

  return flash;
}
