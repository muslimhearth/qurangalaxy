import { useState } from 'react';
import { useGalaxyStore } from '../state/store';
import type { Neighbor } from './helpers';
import { useNewTabGesture } from '../tabs/useNewTabGesture';

/** Number of connected roots shown before "Show all". */
export const CONNECTED_PREVIEW = 12;

const fmt = (n: number) => n.toLocaleString('en');

/**
 * Chips for roots that share verses with the selected root, strongest first.
 * Shows the first `CONNECTED_PREVIEW`; a button reveals the rest.
 * Mount it with `key={rootId}` so the list collapses again for the next root.
 */
export function ConnectedRoots({ links }: { links: Neighbor[] }) {
  const select = useGalaxyStore((s) => s.select);
  const [all, setAll] = useState(false);
  const newTab = useNewTabGesture();
  const shown = all ? links : links.slice(0, CONNECTED_PREVIEW);

  return (
    <section>
      <h3>Connected roots</h3>
      <ul className="chips" aria-label="Connected roots">
        {shown.map(({ root, weight }) => (
          <li key={root.id}>
            <button
              type="button"
              className="chip chip-link"
              title={`${root.tr}: shares ${weight} verses`}
              {...newTab(root.id, () => select(root.id))}
            >
              <span lang="ar" dir="rtl">
                {root.ar}
              </span>
              <span className="count">{fmt(weight)}</span>
            </button>
          </li>
        ))}
      </ul>
      {shown.length < links.length && (
        <button type="button" className="show-more" onClick={() => setAll(true)}>
          Show all {fmt(links.length)} connected roots
        </button>
      )}
    </section>
  );
}
