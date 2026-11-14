import { useGalaxyStore } from '../state/store';
import { showTarget } from '../tabs/target';
import { useNewTabGesture } from '../tabs/useNewTabGesture';
import { snippet } from '../ui/snippet';
import { useVerseTexts } from '../ui/useVerseTexts';
import type { Bookmark } from './model';
import { useBookmarks } from './store';

/** Characters of English shown for a verse bookmark. */
const SNIPPET_CHARS = 80;

const keyOf = (b: Bookmark) => ('root' in b ? `r${b.root}` : `v${b.verse}`);

/**
 * Bookmarked roots and verses, newest first. A tap opens one in the current tab and calls
 * `onPicked`; middle-click, Ctrl/Cmd-click or a long-press opens it in a new tab.
 */
export function BookmarksList({ onPicked }: { onPicked: () => void }) {
  const list = useBookmarks((s) => s.list);
  const remove = useBookmarks((s) => s.remove);
  const roots = useGalaxyStore((s) => s.galaxy?.roots);
  const verses = useVerseTexts(list.some((b) => 'verse' in b));
  const newTab = useNewTabGesture();

  // Roots from older data that the galaxy no longer has are skipped.
  const shown = list.filter((b) => !('root' in b) || roots?.[b.root]);
  if (shown.length === 0) {
    return <p className="bookmarks-empty">No bookmarks yet. Tap the star on a root or a verse to save it here.</p>;
  }

  return (
    <ul className="bookmarks-list">
      {shown.map((b) => {
        const root = 'root' in b ? roots![b.root]! : null;
        const name = root ? root.ar : `verse ${'verse' in b ? b.verse : ''}`;
        return (
          <li key={keyOf(b)} className="bookmark-row">
            <button
              type="button"
              className="bookmark-open"
              aria-label={`Open ${name}`}
              {...newTab(b, () => {
                showTarget(b);
                onPicked();
              })}
            >
              {root ? (
                <>
                  <span className="bookmark-ar" lang="ar" dir="rtl">
                    {root.ar}
                  </span>
                  <span className="bookmark-text">{root.en[0] ?? root.tr}</span>
                </>
              ) : (
                'verse' in b && (
                  <>
                    <span className="bookmark-key">{b.verse}</span>
                    <span className="bookmark-text">{snippet(verses?.[b.verse]?.en ?? '', SNIPPET_CHARS)}</span>
                  </>
                )
              )}
            </button>
            <button type="button" className="bookmark-remove" aria-label={`Remove bookmark ${name}`} onClick={() => remove(b)}>
              ×
            </button>
          </li>
        );
      })}
    </ul>
  );
}
