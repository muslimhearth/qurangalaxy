import { useGalaxyStore } from '../state/store';
import type { TabTarget } from '../tabs/target';
import { sameTarget } from './model';
import { useBookmarks } from './store';

/** Star outline, filled when `on`. */
export const StarIcon = ({ on, size = 16 }: { on: boolean; size?: number }) => (
  <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
    <path
      d="M8 1.6l1.95 4 4.4.6-3.2 3.05.78 4.35L8 11.5l-3.93 2.1.78-4.35L1.65 6.2l4.4-.6z"
      fill={on ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
  </svg>
);

/** Screen-reader name of a target: the root's Arabic, or "verse 2:255". */
export function useTargetName(t: TabTarget): string {
  const root = useGalaxyStore((s) => ('root' in t ? s.galaxy?.roots[t.root] : undefined));
  if ('verse' in t) return `verse ${t.verse}`;
  return root?.ar ?? `root ${t.root}`;
}

/**
 * Star toggle that bookmarks a root or a verse. `className` picks the look:
 * `head-bookmark` in a panel header, `verse-bookmark` on a verse row.
 */
export function BookmarkButton({ target, className = 'head-bookmark' }: { target: TabTarget; className?: string }) {
  const on = useBookmarks((s) => s.list.some((b) => sameTarget(b, target)));
  const toggle = useBookmarks((s) => s.toggle);
  const name = useTargetName(target);
  return (
    <button
      type="button"
      className={`bookmark-toggle ${className}${on ? ' on' : ''}`}
      aria-label={`Bookmark ${name}`}
      aria-pressed={on}
      title={on ? 'Remove bookmark' : 'Bookmark'}
      onClick={() => toggle(target)}
    >
      <StarIcon on={on} />
    </button>
  );
}
