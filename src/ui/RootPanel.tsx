import { useEffect, useMemo, useRef, useState } from 'react';
import { useGalaxyStore } from '../state/store';
import { ConnectedRoots } from './ConnectedRoots';
import { RecenterButton } from './RecenterButton';
import { neighbors } from './helpers';
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

/** Side panel (bottom sheet on phones) with the selected root's lemmas, links and verses. */
export function RootPanel() {
  const galaxy = useGalaxyStore((s) => s.galaxy);
  const selectedId = useGalaxyStore((s) => s.selectedId);
  const select = useGalaxyStore((s) => s.select);
  const details = useRootDetails(selectedId);
  const root = selectedId === null ? undefined : galaxy?.roots[selectedId];
  const links = useMemo(() => (galaxy && root ? neighbors(galaxy, root.id) : []), [galaxy, root]);
  // Phones: the sheet has three sizes. Stored per root, so a new root opens at normal size.
  const [sized, setSized] = useState<{ id: number; size: SheetSize } | null>(null);
  const size: SheetSize = root && sized?.id === root.id ? sized.size : 'normal';
  const resize = (next: SheetSize) => root && setSized({ id: root.id, size: next });
  const collapsed = size === 'min';

  // A verse focus request (e.g. a tap on the Mushaf mosaic) opens a minimized sheet.
  const focus = useVerseFocus((s) => s.request);
  const seenFocus = useRef(focus?.tick ?? 0);
  useEffect(() => {
    if (!focus || focus.tick <= seenFocus.current) return;
    seenFocus.current = focus.tick;
    if (collapsed && root) setSized({ id: root.id, size: 'normal' });
  }, [focus, collapsed, root]);

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
    <aside
      className={`root-panel panel${collapsed ? ' collapsed' : ''}${size === 'max' ? ' max' : ''}`}
      aria-label="Root details"
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
          <ul className="chips" aria-label="Lemmas">
            {root.lemmas.map((l) => (
              <li key={l.ar} className="chip">
                <span lang="ar" dir="rtl">
                  {l.ar}
                </span>
                {l.en[0] && <span className="chip-en">{l.en[0]}</span>}
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
