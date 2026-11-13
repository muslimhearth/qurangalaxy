import { useMemo, useState, type KeyboardEvent } from 'react';
import { useGalaxyStore } from '../state/store';
import { blendMatches } from '../search/blend';
import { exactMatches } from '../search/exact';
import type { Match } from '../search/types';
import type { Verses } from '../data/types';
import type { SemanticService } from '../semantic/service';
import { useSemanticSearch } from '../semantic/useSemanticSearch';
import { getWorkerService } from '../semantic/workerService';
import { SearchSettings } from './SearchSettings';
import { snippet } from './snippet';
import { useVerseTexts } from './useVerseTexts';

/** Number of results in the list. */
const LIMIT = 8;

/**
 * Search field at the top: find a root by Arabic letters, transliteration or lemma, or by
 * topic (a phrase matched against the English verses). The search-mode slider mixes the two.
 */
export function SearchBox({ semanticService = getWorkerService }: { semanticService?: () => SemanticService }) {
  const galaxy = useGalaxyStore((s) => s.galaxy);
  const query = useGalaxyStore((s) => s.query);
  const setQuery = useGalaxyStore((s) => s.setQuery);
  const select = useGalaxyStore((s) => s.select);
  const weight = useGalaxyStore((s) => s.semanticWeight);
  const [active, setActive] = useState(0);

  const semantic = useSemanticSearch(query, weight, semanticService);
  const exact = useMemo(() => (galaxy ? exactMatches(galaxy.roots, query) : []), [galaxy, query]);
  const results = useMemo(
    () => (galaxy ? blendMatches(galaxy.roots, exact, semantic.matches ?? [], weight, LIMIT) : []),
    [galaxy, exact, semantic.matches, weight],
  );
  const verses = useVerseTexts(results.some((m) => m.verses));
  const open = query.trim() !== '';
  // Meaning results are on their way: say so instead of "No roots match".
  const pending = weight > 0 && semantic.matches === null && semantic.status !== 'error';

  const roots = galaxy?.roots ?? [];

  const choose = (id: number) => {
    select(id);
    setQuery('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length === 0) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((a) => (a + step + results.length) % results.length);
    } else if (e.key === 'Enter') {
      const hit = results[active] ?? results[0];
      if (hit) choose(hit.id);
    } else if (e.key === 'Escape' && query !== '') {
      setQuery('');
      // First Escape only clears the query; an empty box lets the next Escape close the panel.
      e.stopPropagation();
    }
  };

  return (
    <div className="search panel">
      <label htmlFor="root-search" className="sr-only">
        Search roots
      </label>
      <div className="search-row">
        <input
          id="root-search"
          type="search"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls="root-search-results"
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `root-option-${results[active].id}` : undefined}
          placeholder={weight > 0 ? 'Search a topic: patience…' : 'Search: رحم, noor, light…'}
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
        <SearchSettings status={semantic.status} progress={semantic.progress} error={semantic.error} />
      </div>
      {open && (
        <ul id="root-search-results" role="listbox" className="search-results" aria-label="Matching roots">
          {results.length === 0 && (
            <li className="search-empty">{pending ? 'Searching by topic…' : 'No roots match.'}</li>
          )}
          {results.map((match, i) => {
            const root = roots[match.id]!;
            return (
              <li
                key={root.id}
                id={`root-option-${root.id}`}
                role="option"
                aria-selected={i === active}
                className="search-option"
                // Keep focus in the input while clicking.
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(root.id)}
              >
                <span className="ar" lang="ar" dir="rtl">
                  {root.ar}
                </span>
                <span className="tr">
                  {root.tr}
                  <ResultNote match={match} meaning={root.en[0]} rootAr={root.ar} verses={verses} />
                </span>
                <span className="count">{root.count.toLocaleString('en')}</span>
              </li>
            );
          })}
        </ul>
      )}
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
