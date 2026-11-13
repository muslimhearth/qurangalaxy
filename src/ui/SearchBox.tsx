import { useMemo, useState, type KeyboardEvent } from 'react';
import { useGalaxyStore } from '../state/store';
import { searchRoots } from './search';

/** Search field at the top: find a root by Arabic letters, transliteration or lemma. */
export function SearchBox() {
  const galaxy = useGalaxyStore((s) => s.galaxy);
  const query = useGalaxyStore((s) => s.query);
  const setQuery = useGalaxyStore((s) => s.setQuery);
  const select = useGalaxyStore((s) => s.select);
  const [active, setActive] = useState(0);

  const results = useMemo(() => (galaxy ? searchRoots(galaxy.roots, query) : []), [galaxy, query]);
  const open = query.trim() !== '';

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
    } else if (e.key === 'Escape') {
      setQuery('');
      // Stop the panel's Escape handler from also closing the selection.
      e.stopPropagation();
    }
  };

  return (
    <div className="search panel">
      <label htmlFor="root-search" className="sr-only">
        Search roots
      </label>
      <input
        id="root-search"
        type="search"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls="root-search-results"
        aria-autocomplete="list"
        aria-activedescendant={open && results[active] ? `root-option-${results[active].id}` : undefined}
        placeholder="Search a root: رحم, rhm, رحمن…"
        autoComplete="off"
        spellCheck={false}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
      />
      {open && (
        <ul id="root-search-results" role="listbox" className="search-results" aria-label="Matching roots">
          {results.length === 0 && <li className="search-empty">No roots match.</li>}
          {results.map((root, i) => (
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
              <span className="tr">{root.tr}</span>
              <span className="count">{root.count.toLocaleString('en')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
