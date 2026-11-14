import { useEffect, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from 'react';
import { useGalaxyStore } from '../state/store';
import { blendMatches } from '../search/blend';
import { exactMatches } from '../search/exact';
import type { Match } from '../search/types';
import type { VerseKey, Verses } from '../data/types';
import { useSearchHistory, type HistoryEntry } from '../history/history';
import type { SemanticService } from '../semantic/service';
import { useSemanticSearch } from '../semantic/useSemanticSearch';
import { getWorkerService } from '../semantic/workerService';
import { parseVerseQuery } from '../verses/verseKey';
import { useVerseWeight } from '../verses/verseWeight';
import { BookmarksButton } from '../bookmarks/BookmarksButton';
import { HistoryList } from './HistoryList';
import { ModeSwitch } from './ModeSwitch';
import { SearchSettings } from './SearchSettings';
import { snippet } from './snippet';
import { useVerseResults } from './useVerseResults';
import { useVerseTexts } from './useVerseTexts';
import { useNewTabGesture } from '../tabs/useNewTabGesture';
import type { TargetLike } from '../tabs/target';
import { VerseOption } from './VerseOption';

/** Number of root results in the list. */
const LIMIT = 8;

/** One row of the result list. */
interface Option {
  id: string;
  className: string;
  choose: () => void;
  /** The root id or verse a long-press or middle-click opens in a new tab. */
  target?: TargetLike;
  body: ReactNode;
}

/** True on a desktop-like device (mouse or trackpad). Phones get no auto focus: it would pop the keyboard over the galaxy. */
function hasFinePointer(): boolean {
  return window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;
}

/**
 * Search field at the top. Roots mode: find a root by Arabic letters, transliteration, lemma or
 * meaning. Verses mode: find verses by English words, transliteration or meaning. In any mode,
 * "s:v" (e.g. 3:109) opens that verse. An empty, focused field shows the recent searches.
 */
export function SearchBox({ semanticService = getWorkerService }: { semanticService?: () => SemanticService }) {
  const galaxy = useGalaxyStore((s) => s.galaxy);
  const query = useGalaxyStore((s) => s.query);
  const setQuery = useGalaxyStore((s) => s.setQuery);
  const select = useGalaxyStore((s) => s.select);
  const mode = useGalaxyStore((s) => s.searchMode);
  const setMode = useGalaxyStore((s) => s.setSearchMode);
  const setOpenVerse = useGalaxyStore((s) => s.setOpenVerse);
  const rootWeight = useGalaxyStore((s) => s.semanticWeight);
  const verseWeight = useVerseWeight((s) => s.weight);
  const setVerseWeight = useVerseWeight((s) => s.setWeight);
  const record = useSearchHistory((s) => s.record);
  const [active, setActive] = useState(0);
  const newTab = useNewTabGesture();
  // False after a verse is picked: the list hides until the user types or focuses again.
  const [listOpen, setListOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const autoFocused = useRef(false);

  // Desktop: focus the field on load, so the user can type at once.
  useEffect(() => {
    if (!hasFinePointer()) return;
    autoFocused.current = true;
    input.current?.focus();
  }, []);

  const verseQuery = useMemo(() => parseVerseQuery(query), [query]);
  // A verse key is not a word search.
  const text = verseQuery.kind === 'none' ? query : '';
  const rootsOn = mode === 'roots';

  // Roots mode.
  const semantic = useSemanticSearch(rootsOn ? text : '', rootsOn ? rootWeight : 0, semanticService);
  const exact = useMemo(() => (galaxy && rootsOn ? exactMatches(galaxy.roots, text) : []), [galaxy, rootsOn, text]);
  const rootResults = useMemo(
    () => (galaxy && rootsOn ? blendMatches(galaxy.roots, exact, semantic.matches ?? [], rootWeight, LIMIT) : []),
    [galaxy, rootsOn, exact, semantic.matches, rootWeight],
  );
  const rootVerses = useVerseTexts(rootResults.some((m) => m.verses));
  const rootsPending = rootWeight > 0 && semantic.matches === null && semantic.status !== 'error';

  // Verses mode.
  const verseResults = useVerseResults(text, !rootsOn, verseWeight, semanticService);
  const keyVerses = useVerseTexts(verseQuery.kind === 'verse');

  const roots = galaxy?.roots ?? [];

  const chooseRoot = (id: number) => {
    record({ query, mode });
    setOpenVerse(null);
    select(id);
    setQuery('');
    // The field is empty now, but the user just picked something: no history over the galaxy.
    setHistoryOpen(false);
  };

  const chooseVerse = (key: VerseKey) => {
    record({ query, mode });
    setOpenVerse(key);
    // A typed key has nothing more to show; a word search keeps its results for the next pick.
    if (verseQuery.kind === 'verse') setQuery('');
    else setListOpen(false);
    setHistoryOpen(false);
    // Phones: close the keyboard so the verse sheet is visible.
    if (!hasFinePointer()) input.current?.blur();
  };

  const options: Option[] = [];
  if (verseQuery.kind === 'verse') {
    const key = verseQuery.key;
    options.push({
      id: `verse-option-${key.replace(':', '-')}`,
      className: 'search-option verse-option',
      choose: () => chooseVerse(key),
      target: { verse: key },
      body: <VerseOption verseKey={key} verse={keyVerses?.[key]} query="" source="semantic" />,
    });
  }
  if (rootsOn) {
    for (const match of rootResults) {
      const root = roots[match.id]!;
      options.push({
        id: `root-option-${root.id}`,
        className: 'search-option',
        target: root.id,
        choose: () => chooseRoot(root.id),
        body: (
          <>
            <span className="ar" lang="ar" dir="rtl">
              {root.ar}
            </span>
            <span className="tr">
              {root.tr}
              <ResultNote match={match} meaning={root.en[0]} rootAr={root.ar} verses={rootVerses} />
            </span>
            <span className="count">{root.count.toLocaleString('en')}</span>
          </>
        ),
      });
    }
  } else {
    for (const m of verseResults.matches) {
      options.push({
        id: `verse-option-${m.key.replace(':', '-')}`,
        className: 'search-option verse-option',
        choose: () => chooseVerse(m.key),
        target: { verse: m.key },
        body: (
          <VerseOption
            verseKey={m.key}
            verse={verseResults.verses?.[m.key]}
            translit={verseResults.translit?.[m.key]}
            query={text}
            source={m.source}
          />
        ),
      });
    }
  }

  let empty: string;
  if (verseQuery.kind === 'invalid') empty = verseQuery.message;
  else if (rootsOn) empty = rootsPending ? 'Searching by meaning…' : 'No roots match.';
  else if (!verseResults.ready) empty = 'Loading verses…';
  else empty = verseResults.pending ? 'Searching by meaning…' : 'No verses match.';

  const open = query.trim() !== '' && listOpen;
  const showHistory = historyOpen && query === '';

  const reopen = () => {
    setActive(0);
    setListOpen(true);
  };

  const runHistory = (entry: HistoryEntry) => {
    setMode(entry.mode);
    setQuery(entry.query);
    reopen();
    input.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return reopen();
      if (options.length === 0) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((a) => (a + step + options.length) % options.length);
    } else if (e.key === 'Enter') {
      if (query.trim() === '') return;
      record({ query, mode });
      (options[active] ?? options[0])?.choose();
    } else if (e.key === 'Escape' && query !== '') {
      setQuery('');
      // First Escape only clears the query; an empty box lets the next Escape close the panel.
      e.stopPropagation();
    }
  };

  // Hide the history once focus leaves the search panel (not when it moves to a history button).
  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHistoryOpen(false);
  };

  const settings = rootsOn
    ? { status: semantic.status, progress: semantic.progress, error: semantic.error }
    : {
        status: verseResults.semantic.status,
        progress: verseResults.semantic.progress,
        error: verseResults.semantic.error,
        weight: verseWeight,
        onWeight: setVerseWeight,
      };

  return (
    <div className="search panel" onBlur={onBlur}>
      <label htmlFor="root-search" className="sr-only">
        {rootsOn ? 'Search roots' : 'Search verses'}
      </label>
      <div className="search-row">
        <input
          ref={input}
          id="root-search"
          type="search"
          role="combobox"
          aria-expanded={open && options.length > 0}
          aria-controls="root-search-results"
          aria-autocomplete="list"
          aria-activedescendant={open && options[active] ? options[active].id : undefined}
          placeholder={
            rootsOn
              ? rootWeight > 0
                ? 'Search a phrase: patience…'
                : 'Search: رحم, noor, light…'
              : 'Verses: mercy, rahman, 2:255…'
          }
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHistoryOpen(true);
            reopen();
          }}
          onFocus={() => {
            // The automatic focus on load does not open the history over the galaxy.
            if (autoFocused.current) autoFocused.current = false;
            else setHistoryOpen(true);
            setListOpen(true);
          }}
          onPointerDown={() => setHistoryOpen(true)}
          onKeyDown={onKeyDown}
        />
        <ModeSwitch
          onSwitch={() => {
            reopen();
            input.current?.focus();
          }}
        />
        <SearchSettings {...settings} />
        <BookmarksButton />
      </div>
      {open && (
        <ul
          id="root-search-results"
          role="listbox"
          className="search-results"
          aria-label={rootsOn ? 'Matching roots' : 'Matching verses'}
        >
          {options.length === 0 && <li className="search-empty">{empty}</li>}
          {options.map((opt, i) => (
            <li
              key={opt.id}
              id={opt.id}
              role="option"
              aria-selected={i === active}
              className={opt.className}
              onClick={opt.choose}
              // Roots and verses also open in a new tab on long-press or middle-click (this click handler
              // replaces the one above); the mouse-down handler below still wins.
              {...(opt.target === undefined ? {} : newTab(opt.target, opt.choose))}
              // Keep focus in the input while clicking.
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
            >
              {opt.body}
            </li>
          ))}
          {!rootsOn && options.length > 0 && verseResults.pending && (
            <li className="search-empty" aria-live="polite">
              Searching by meaning…
            </li>
          )}
        </ul>
      )}
      {showHistory && <HistoryList onPick={runHistory} />}
    </div>
  );
}

/**
 * Second line of a result: what matched when it was not the root itself (a lemma, an
 * English meaning, or the best verses of a meaning search), else the root's first meaning.
 */
function ResultNote({
  match,
  meaning,
  rootAr,
  verses,
}: {
  match: Match;
  meaning?: string;
  rootAr: string;
  verses: Verses | null;
}) {
  const { kind, text } = match.reason;
  if (match.verses?.length) {
    const first = verses?.[match.verses[0]!];
    return (
      <span className="note verse-note" title={first?.en}>
        <span className="refs">{match.verses.join(', ')}</span>
        {first && <> · {snippet(first.en, 90)}</>}
      </span>
    );
  }
  if (kind === 'arabic' && text !== rootAr) {
    return (
      <span className="note" lang="ar" dir="rtl">
        {text}
      </span>
    );
  }
  if (kind === 'english' || kind === 'semantic') return <span className="note">{text}</span>;
  return meaning ? <span className="note">{meaning}</span> : null;
}
