import { useSearchHistory, type HistoryEntry } from '../history/history';

/** Recent searches under the empty, focused search field: tap one to run it again. */
export function HistoryList({ onPick }: { onPick: (entry: HistoryEntry) => void }) {
  const entries = useSearchHistory((s) => s.entries);
  const remove = useSearchHistory((s) => s.remove);
  if (entries.length === 0) return null;
  return (
    <div className="search-history">
      <p className="search-history-title" id="search-history-title">
        Recent searches
      </p>
      <ul aria-labelledby="search-history-title">
        {entries.map((e) => (
          <li key={`${e.mode}:${e.query}`}>
            <button
              type="button"
              className="history-run"
              // Keep focus (and the phone keyboard) in the search field.
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => onPick(e)}
            >
              <span className="history-query">{e.query}</span>
              <span className="history-mode">{e.mode === 'verses' ? 'Verses' : 'Roots'}</span>
            </button>
            <button
              type="button"
              className="history-remove"
              aria-label={`Remove "${e.query}" from history`}
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => remove(e)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
