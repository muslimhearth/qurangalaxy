import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useTabsStore } from '../tabs/store';
import { StarIcon } from './BookmarkButton';
import { BookmarksList } from './BookmarksList';
import { useBookmarks } from './store';

/** Where the popover sits on desktop: under the button, right edges lined up. */
interface Anchor {
  top: number;
  right: number;
}

/**
 * Button that opens the bookmarks: a popover under the button on desktop, a bottom sheet on
 * phones (CSS). The popover renders into `document.body`, so no transformed parent (the search
 * bar) can clip it or change its fixed position. Escape, a press outside or a tab switch closes it.
 */
export function BookmarksButton() {
  const count = useBookmarks((s) => s.list.length);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor>({ top: 0, right: 0 });
  const button = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);

  // Follow the button while open (window resize, phone rotation).
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = button.current?.getBoundingClientRect();
      if (r) setAnchor({ top: r.bottom + 10, right: Math.max(8, window.innerWidth - r.right - 8) });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: Event) => {
      const t = e.target as Node;
      if (!button.current?.contains(t) && !pop.current?.contains(t)) setOpen(false);
    };
    // A long-press switches to the new tab: the list has done its job.
    const offTabs = useTabsStore.subscribe((s, prev) => {
      if (s.activeId !== prev.activeId) setOpen(false);
    });
    document.addEventListener('pointerdown', onOutside);
    document.addEventListener('focusin', onOutside);
    return () => {
      offTabs();
      document.removeEventListener('pointerdown', onOutside);
      document.removeEventListener('focusin', onOutside);
    };
  }, [open]);

  // React events from the portal bubble here too.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || !open) return;
    // Close only the list, not the panel behind it.
    e.stopPropagation();
    setOpen(false);
    button.current?.focus();
  };

  const style = { '--pop-top': `${anchor.top}px`, '--pop-right': `${anchor.right}px` } as CSSProperties;

  return (
    <span className="bookmarks" onKeyDown={onKeyDown}>
      <button
        ref={button}
        type="button"
        className={`bookmarks-button${count > 0 ? ' on' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={count > 0 ? `Bookmarks (${count})` : 'Bookmarks'}
        title="Bookmarks"
        onClick={() => setOpen((o) => !o)}
      >
        <StarIcon on={count > 0} size={15} />
      </button>
      {open &&
        createPortal(
          <div ref={pop} className="bookmarks-pop panel" role="dialog" aria-label="Bookmarks" style={style}>
            <div className="bookmarks-head">
              <h2>Bookmarks</h2>
              <button type="button" className="close" aria-label="Close bookmarks" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>
            <BookmarksList onPicked={() => setOpen(false)} />
          </div>,
          document.body,
        )}
    </span>
  );
}
