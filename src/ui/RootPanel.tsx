import { useEffect, useMemo, useRef, useState } from 'react';
import { useGalaxyStore } from '../state/store';
import { BookmarkButton } from '../bookmarks/BookmarkButton';
import { ConnectedRoots } from './ConnectedRoots';
import { RecenterButton } from './RecenterButton';
import { LemmaChips } from './LemmaChips';
import { MeaningsToggle } from './meanings';
import { neighbors } from './helpers';
import { useLemmaVerses } from './useLemmaVerses';
import { useRootDetails } from './useRootDetails';
import { VerseList } from './VerseList';
import { useVerseFocus } from './verseFocus';

const fmt = (n: number) => n.toLocaleString('en');

/** Bottom-sheet size on phones: header only, normal, or nearly full screen. */
type SheetSize = 'min' | 'normal' | 'max';
const UP: Record<SheetSize, SheetSize> = { min: 'normal', normal: 'max', max: 'max' };
const DOWN: Record<SheetSize, SheetSize> = { min: 'min', normal: 'min', max: 'normal' };

/** Chevron icon pointing up or down. */
const Chevron = ({ up }: { up: boolean }) => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
    <path
      d={up ? 'M4 10l4-4 4 4' : 'M4 6l4 4 4-4'}
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Side panel (bottom sheet on phones) with the selected root's lemmas, links and verses.
 * `hidden`: kept mounted but not shown (under the surah reader), so its state survives.
 */
export function RootPanel({ hidden = false }: { hidden?: boolean }) {
  const galaxy = useGalaxyStore((s) => s.galaxy);
  const selectedId = useGalaxyStore((s) => s.selectedId);
  const select = useGalaxyStore((s) => s.select);
  const setQuery = useGalaxyStore((s) => s.setQuery);
  const details = useRootDetails(selectedId);
  const root = selectedId === null ? undefined : galaxy?.roots[selectedId];
  const links = useMemo(() => (galaxy && root ? neighbors(galaxy, root.id) : []), [galaxy, root]);
  // Phones: the sheet has three sizes. Stored per root, so a new root opens at normal size.
  const [sized, setSized] = useState<{ id: number; size: SheetSize } | null>(null);
  const size: SheetSize = root && sized?.id === root.id ? sized.size : 'normal';
  const resize = (next: SheetSize) => root && setSized({ id: root.id, size: next });
  const collapsed = size === 'min';
  // Lemma filter ("Words from this root"): the picked lemma index, kept per root.
  const [picked, setPicked] = useState<{ id: number; lemma: number } | null>(null);
  const lemma = root && picked?.id === root.id ? picked.lemma : null;
  const pickLemma = (next: number | null) => root && setPicked(next === null ? null : { id: root.id, lemma: next });
  const filtered = useLemmaVerses(root?.id ?? -1, details.occurrences, lemma);

  // A verse focus request (e.g. a tap on a verse search result) opens a minimized sheet.
  const focus = useVerseFocus((s) => s.request);
  const seenFocus = useRef(focus?.tick ?? 0);
  useEffect(() => {
    if (!focus || focus.tick <= seenFocus.current) return;
    seenFocus.current = focus.tick;
    if (collapsed && root) setSized({ id: root.id, size: 'normal' });
  }, [focus, collapsed, root]);

  useEffect(() => {
    if (!root || hidden) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      select(null);
      // Search text left in the field (e.g. typed, then a star was clicked) would keep the tab
      // labelled with it. Escape means "back to nothing", so the tab becomes "New tab".
      // (Inside the search field, the first Escape only clears the text; see SearchBox.)
      setQuery('');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [root, hidden, select, setQuery]);

  if (!root) return null;

  return (
    <aside
      className={`root-panel panel${collapsed ? ' collapsed' : ''}${size === 'max' ? ' max' : ''}`}
      aria-label="Root details"
      hidden={hidden}
    >
      {/* A tap anywhere on a minimized sheet's header opens it (the buttons keep their own job). */}
      <header
        className="root-head"
        onClick={(e) => {
          if (collapsed && !(e.target as HTMLElement).closest('button')) resize('normal');
        }}
      >
        <h2 className="root-ar" lang="ar" dir="rtl">
          {root.ar}
        </h2>
        <div>
          <p className="root-tr">{root.tr}</p>
          {root.en.length > 0 && (
            <p className="root-en" aria-label="Meanings">
              {root.en.join(', ')}
            </p>
          )}
          <p className="root-stats">
            {fmt(root.count)} words · {fmt(root.verseCount)} verses
          </p>
        </div>
        <div className="head-buttons">
          <BookmarkButton target={{ root: root.id }} />
          {size !== 'max' && (
            <button
              type="button"
              className="sheet-size"
              aria-label={collapsed ? 'Expand root details' : 'Maximize root details'}
              onClick={() => resize(UP[size])}
            >
              <Chevron up />
            </button>
          )}
          {size !== 'min' && (
            <button
              type="button"
              className="sheet-size"
              aria-label={size === 'max' ? 'Restore root details' : 'Minimize root details'}
              onClick={() => resize(DOWN[size])}
            >
              <Chevron up={false} />
            </button>
          )}
          <button type="button" className="close" aria-label="Close root details" onClick={() => select(null)}>
            ×
          </button>
        </div>
      </header>

      {/* Rides on the panel's edge, so it never covers the sheet or the search popover. */}
      {size !== 'max' && <RecenterButton />}

      {/* hidden, not unmounted: "show more" and scroll position survive a minimize. */}
      <div className="root-body" hidden={collapsed}>
        <section>
          <h3>Words from this root</h3>
          <LemmaChips lemmas={root.lemmas} picked={lemma} onPick={pickLemma} />
        </section>

        {links.length > 0 && <ConnectedRoots key={root.id} root={root} links={links} />}

        <section>
          <div className="section-head">
            <h3>Verses</h3>
            <MeaningsToggle />
          </div>
          {details.status === 'loading' && <p className="muted">Loading verses…</p>}
          {details.status === 'error' && (
            <p className="error" role="alert">
              Could not load verses. {details.error}
            </p>
          )}
          {details.status === 'ready' && details.verses && lemma !== null && (
            <LemmaFilterHead
              lemma={root.lemmas[lemma]?.ar ?? ''}
              count={filtered.status === 'ready' ? filtered.occurrences.length : null}
              failed={filtered.status === 'error'}
              onClear={() => pickLemma(null)}
            />
          )}
          {details.status === 'ready' && details.verses && (lemma === null || filtered.status === 'ready') && (
            // key resets "show more" when the root or the lemma filter changes.
            <VerseList
              key={`${root.id}-${lemma}`}
              occurrences={filtered.status === 'ready' ? filtered.occurrences : details.occurrences}
              verses={details.verses}
            />
          )}
        </section>
      </div>
    </aside>
  );
}

/** "N verses with <lemma>" above a filtered verse list, with a button that clears the filter. */
function LemmaFilterHead(props: { lemma: string; count: number | null; failed: boolean; onClear: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  // Phones: the chips can fill the sheet; bring the filtered list to the top of the panel body.
  useEffect(() => {
    ref.current?.scrollIntoView?.({ block: 'start' });
    // Again once the list is there: while lemmas.json loads, the body is too short to scroll.
  }, [props.lemma, props.count !== null]);
  return (
    <div className="lemma-filter" ref={ref}>
      <p role="status">
        {props.failed ? (
          'Could not load the word filter.'
        ) : props.count === null ? (
          'Loading…'
        ) : (
          <>
            {fmt(props.count)} {props.count === 1 ? 'verse' : 'verses'} with{' '}
            <mark lang="ar" dir="rtl">
              {props.lemma}
            </mark>
          </>
        )}
      </p>
      <button type="button" className="close" aria-label="Show all verses" title="Show all verses" onClick={props.onClear}>
        ×
      </button>
    </div>
  );
}
