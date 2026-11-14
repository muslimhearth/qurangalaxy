import type { TabKind } from './caption';

/** Inner SVG paths for each tab kind (20×20 grid, stroked). */
const PATHS: Record<TabKind, React.ReactNode> = {
  // A star with rays: a root is a star in the galaxy.
  root: (
    <>
      <circle cx="10" cy="10" r="2.6" fill="currentColor" />
      <path d="M10 2.5v3M10 14.5v3M2.5 10h3M14.5 10h3M4.7 4.7l2 2M13.3 13.3l2 2M15.3 4.7l-2 2M6.7 13.3l-2 2" strokeWidth="1.3" />
    </>
  ),
  reader: <path d="M10 5.5c-1.6-1.2-3.8-1.6-6.5-1.5v11c2.7-.1 4.9.3 6.5 1.5 1.6-1.2 3.8-1.6 6.5-1.5V4c-2.7-.1-4.9.3-6.5 1.5zM10 5.5v11" />,
  verse: <path d="M4 6h12M4 10h12M4 14h8" />,
  search: (
    <>
      <circle cx="8.5" cy="8.5" r="5" />
      <path d="M12.3 12.3l4.2 4.2" />
    </>
  ),
  empty: <path d="M10 5v10M5 10h10" />,
};

/** Small line icon for a tab kind (root, reader, verse, search, empty). Decorative. */
export function TabKindIcon({ kind, size = 18 }: { kind: TabKind; size?: number }) {
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[kind]}
    </svg>
  );
}
