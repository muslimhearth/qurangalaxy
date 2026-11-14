import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import type { VerseKey } from '../data/types';
import { placeOf } from '../reader/surahs';
import { useGalaxyStore } from '../state/store';
import { openInNewTab } from '../tabs/actions';
import { useNewTabGesture } from '../tabs/useNewTabGesture';
import { useWordCard } from './cardStore';
import { InQuran, type RowKey } from './InQuran';
import { popoverPlace, sheetScroll } from './placement';
import { useWordData } from './useWordData';
import { WordDetails } from './WordDetails';
import './wordCard.css';

/** Screens that get the bottom sheet (same breakpoint as the panels' bottom sheet). */
export const SHEET_QUERY = '(max-width: 720px)';

const subscribe = (onChange: () => void) => {
  const m = window.matchMedia?.(SHEET_QUERY);
  m?.addEventListener?.('change', onChange);
  return () => m?.removeEventListener?.('change', onChange);
};

/** True on phone-sized screens, where the card is a bottom sheet. */
export function useIsPhone(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia?.(SHEET_QUERY).matches ?? false);
}

/** Opens a root in the current tab: the reader and the verse panel close, the root panel shows. */
function selectRoot(id: number): void {
  const g = useGalaxyStore.getState();
  g.setReader(null);
  g.setOpenVerse(null);
  g.setQuery('');
  g.select(id);
}

/**
 * The word card: a tapped Quran word's parts, grammar, lemma, root and how often it occurs.
 * Phones: a bottom sheet without a scrim, so another word can be tapped. Desktop: a popover beside
 * the panel with an arrow at the word's line. Escape or × closes it and focus goes back to the word.
 */
export function WordCard() {
  const word = useWordCard((s) => s.word);
  const anchor = useWordCard((s) => s.anchor);
  const close = useWordCard((s) => s.close);
  const phone = useIsPhone();
  const state = useWordData(word);
  const bind = useNewTabGesture();
  const card = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const wordKey = word ? `${word.verse}:${word.pos}` : '';
  const [expanded, setExpanded] = useState<{ word: string; row: RowKey } | null>(null);
  const openRow = expanded?.word === wordKey ? expanded.row : null;

  // Another place (reader, verse, root, tab) means another text: the card closes.
  const place = useGalaxyStore((s) => `${s.reader?.surah}:${s.reader?.verse}|${s.openVerse}|${s.selectedId}`);
  useEffect(() => close(), [place, close]);

  // Focus goes to the close button when a word opens.
  useEffect(() => {
    if (wordKey) closeButton.current?.focus({ preventScroll: true });
  }, [wordKey]);

  /** Closes the card and puts focus back on the tapped word. */
  const dismiss = () => {
    const el = anchor;
    close();
    el?.focus({ preventScroll: true });
  };
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;

  // Escape closes the card only (not the reader or the panel under it); a click outside closes it.
  useEffect(() => {
    if (!wordKey) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      dismissRef.current();
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (!t?.isConnected || card.current?.contains(t) || t.closest('.qw')) return;
      useWordCard.getState().close();
    };
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('click', onClick, true);
    };
  }, [wordKey]);

  // Desktop: keep the popover beside the panel, its arrow at the word, while the panel scrolls.
  useLayoutEffect(() => {
    const el = card.current;
    if (!el || !anchor || phone) return;
    const place = () => {
      if (!anchor.isConnected) return useWordCard.getState().close();
      const panel = anchor.closest('.root-panel') ?? anchor;
      const p = popoverPlace(anchor.getBoundingClientRect(), panel.getBoundingClientRect(), el.offsetHeight, window.innerHeight);
      el.style.left = `${p.left}px`;
      el.style.top = `${p.top}px`;
      el.style.setProperty('--arrow-y', `${p.arrowY}px`);
    };
    place();
    const onMove = () => requestAnimationFrame(place);
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [anchor, phone, state.status, openRow]);

  // Phone: scroll the panel so the tapped word's line shows just above the sheet.
  useLayoutEffect(() => {
    const el = card.current;
    if (!el || !anchor || !phone) return;
    const body = anchor.closest<HTMLElement>('.root-body');
    if (!body) return;
    const delta = sheetScroll(anchor.getBoundingClientRect(), body.getBoundingClientRect().top, el.getBoundingClientRect().top);
    if (delta !== 0) body.scrollTop += delta;
  }, [anchor, phone, openRow !== null, state.status]);

  if (!word) return null;
  const toggle = (row: RowKey) => setExpanded(openRow === row ? null : { word: wordKey, row });
  const openVerse = (key: VerseKey) => {
    close();
    useGalaxyStore.getState().setReader(placeOf(key));
  };
  // Phones open the root in a new tab, so the reader stays where it is.
  const openRoot = (id: number) => {
    close();
    if (phone) openInNewTab(id, true);
    else selectRoot(id);
  };
  const data = state.status === 'ready' ? state.data : null;
  const text = data?.text ?? anchor?.textContent ?? '';

  return createPortal(
    <section
      ref={card}
      className={`wc ${phone ? 'sheet' : 'pop'}${openRow ? ' tall' : ''}`}
      role="dialog"
      aria-label={`Word ${word.pos} of ${word.verse}`}
    >
      {phone && <div className="wc-grab" aria-hidden="true" />}
      <header className="wc-head">
        <span className="wc-where">
          <b>{word.verse}</b> · word {data?.word.pos ?? word.pos}
        </span>
        <span className="wc-word" lang="ar" dir="rtl">
          {text}
        </span>
        <button ref={closeButton} type="button" className="wc-x" aria-label="Close word details" onClick={dismiss}>
          ×
        </button>
      </header>
      <div className="wc-scroll">
        {state.status === 'loading' && <p className="muted">Loading the word…</p>}
        {state.status === 'error' && <p className="muted">The word details could not load.</p>}
        {data && (
          <>
            <WordDetails data={data} rootLink={data.root ? bind(data.root.id, () => openRoot(data.root!.id)) : undefined} />
            <InQuran data={data} current={word.verse} open={openRow} onToggle={toggle} onVerse={openVerse} bind={bind} />
          </>
        )}
        <p className="wc-foot">
          Morphology:{' '}
          <a href="https://corpus.quran.com/" target="_blank" rel="noreferrer">
            Quranic Arabic Corpus
          </a>
        </p>
      </div>
    </section>,
    document.body,
  );
}
