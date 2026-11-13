import { useEffect, useMemo } from 'react';
import { useGalaxyStore } from '../state/store';
import { ConnectedRoots } from './ConnectedRoots';
import { neighbors } from './helpers';
import { useRootDetails } from './useRootDetails';
import { VerseList } from './VerseList';

const fmt = (n: number) => n.toLocaleString('en');

/** Side panel (bottom sheet on phones) with the selected root's lemmas, links and verses. */
export function RootPanel() {
  const galaxy = useGalaxyStore((s) => s.galaxy);
  const selectedId = useGalaxyStore((s) => s.selectedId);
  const select = useGalaxyStore((s) => s.select);
  const details = useRootDetails(selectedId);
  const root = selectedId === null ? undefined : galaxy?.roots[selectedId];
  const links = useMemo(() => (galaxy && root ? neighbors(galaxy, root.id) : []), [galaxy, root]);

  useEffect(() => {
    if (!root) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') select(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [root, select]);

  if (!root) return null;

  return (
    <aside className="root-panel panel" aria-label="Root details">
      <header className="root-head">
        <h2 className="root-ar" lang="ar" dir="rtl">
          {root.ar}
        </h2>
        <div>
          <p className="root-tr">{root.tr}</p>
          <p className="root-stats">
            {fmt(root.count)} words · {fmt(root.verseCount)} verses
          </p>
        </div>
        <button type="button" className="close" aria-label="Close root details" onClick={() => select(null)}>
          ×
        </button>
      </header>

      <div className="root-body">
        <section>
          <h3>Words from this root</h3>
          <ul className="chips" aria-label="Lemmas">
            {root.lemmas.map((l) => (
              <li key={l.ar} className="chip">
                <span lang="ar" dir="rtl">
                  {l.ar}
                </span>
                <span className="count">{fmt(l.count)}</span>
              </li>
            ))}
          </ul>
        </section>

        {links.length > 0 && <ConnectedRoots key={root.id} links={links} />}

        <section>
          <h3>Verses</h3>
          {details.status === 'loading' && <p className="muted">Loading verses…</p>}
          {details.status === 'error' && (
            <p className="error" role="alert">
              Could not load verses. {details.error}
            </p>
          )}
          {details.status === 'ready' && details.verses && (
            // key resets "show more" when the root changes.
            <VerseList key={root.id} occurrences={details.occurrences} verses={details.verses} />
          )}
        </section>
      </div>
    </aside>
  );
}
