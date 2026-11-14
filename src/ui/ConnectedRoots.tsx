import { useEffect, useRef, useState } from 'react';
import type { Root } from '../data/types';
import { useGalaxyStore } from '../state/store';
import type { Neighbor } from './helpers';
import { useSharedVerses } from './sharedVerses';
import { VerseList } from './VerseList';

/** Number of connected roots shown before "Show all". */
export const CONNECTED_PREVIEW = 12;

const fmt = (n: number) => n.toLocaleString('en');

/** How many times more often two roots share a verse than chance: score / log2(1 + shared). */
export function liftOf({ weight, score }: Pick<Neighbor, 'weight' | 'score'>): number {
  return score / Math.log2(1 + weight);
}

/** Lift for the chip title: one decimal below 10, whole numbers above. */
const fmtLift = (lift: number) => (lift < 10 ? lift.toFixed(1) : fmt(Math.round(lift)));

/**
 * Chips for roots linked to the selected `root`, highest link score first. The name selects that
 * root; the count shows the verses both roots share. Shows the first `CONNECTED_PREVIEW`; a button
 * reveals the rest. Mount it with `key={root.id}` so the list collapses again for the next root.
 */
export function ConnectedRoots({ root, links }: { root: Root; links: Neighbor[] }) {
  const select = useGalaxyStore((s) => s.select);
  const [all, setAll] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const shown = all ? links : links.slice(0, CONNECTED_PREVIEW);
  const open = links.find((l) => l.root.id === openId);

  return (
    <section>
      <h3>Connected roots</h3>
      <p className="section-note">
        Roots that appear with{' '}
        <span lang="ar" dir="rtl">
          {root.ar}
        </span>{' '}
        more than chance
      </p>
      <ul className="chips" aria-label="Connected roots">
        {shown.map((link) => (
          <li key={link.root.id} className="chip link-chip">
            <button
              type="button"
              className="chip-name"
              title={`${link.root.tr}: ${fmt(link.weight)} shared verses, ${fmtLift(liftOf(link))}× more often than chance`}
              onClick={() => select(link.root.id)}
            >
              <span lang="ar" dir="rtl">
                {link.root.ar}
              </span>
            </button>
            <button
              type="button"
              className="chip-count count"
              aria-label={`Show the ${fmt(link.weight)} verses shared with ${link.root.ar}`}
              aria-pressed={openId === link.root.id}
              onClick={() => setOpenId(openId === link.root.id ? null : link.root.id)}
            >
              {fmt(link.weight)}
            </button>
          </li>
        ))}
      </ul>
      {shown.length < links.length && (
        <button type="button" className="show-more" onClick={() => setAll(true)}>
          Show all {fmt(links.length)} connected roots
        </button>
      )}
      {open && <Shared root={root} other={open.root} onClose={() => setOpenId(null)} />}
    </section>
  );
}

/** The verses `root` and `other` share, both roots marked, with a close button. */
function Shared({ root, other, onClose }: { root: Root; other: Root; onClose: () => void }) {
  const shared = useSharedVerses(root.id, other.id);
  const ref = useRef<HTMLElement>(null);
  // Bring the list into view: on phones the chips can fill the sheet.
  useEffect(() => ref.current?.scrollIntoView?.({ block: 'nearest' }), [other.id]);
  const label = `Verses with ${root.ar} and ${other.ar}`;
  return (
    <section className="shared-verses" aria-label={label} ref={ref}>
      <div className="shared-head">
        <p>
          Verses with{' '}
          <mark lang="ar" dir="rtl">
            {root.ar}
          </mark>{' '}
          and{' '}
          <mark className="alt" lang="ar" dir="rtl">
            {other.ar}
          </mark>
        </p>
        <button type="button" className="close" aria-label="Close shared verses" onClick={onClose}>
          ×
        </button>
      </div>
      {shared ? (
        <VerseList key={other.id} occurrences={shared.occurrences} verses={shared.verses} others={shared.others} />
      ) : (
        <p className="muted">Loading verses…</p>
      )}
    </section>
  );
}
