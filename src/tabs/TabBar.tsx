import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type WheelEvent } from 'react';
import { useGalaxyStore } from '../state/store';
import { openEmptyTab } from './actions';
import { useTabLayout } from './layout';
import { showsTabs, tabLabel } from './model';
import { useTabsStore } from './store';
import { edgeFades, revealScroll, type EdgeFades } from './strip';
import { TabSwitcher } from './TabSwitcher';

/** Keys that move focus inside the tab list, mapped to the next index. */
const MOVES: Record<string, (i: number, n: number) => number> = {
  ArrowRight: (i, n) => (i + 1) % n,
  ArrowLeft: (i, n) => (i - 1 + n) % n,
  Home: () => 0,
  End: (_, n) => n - 1,
};

/** Width of the strip's edge fades (CSS mask); the active pill stays clear of them. */
const FADE_PX = 26;

const NO_FADES: EdgeFades = { overflow: false, start: false, end: false };

/**
 * Desktop tabs (900 px and wider, with a mouse): slim pills in one glass rail right of the search
 * bar. The strip scrolls sideways and keeps the active pill fully in view; its edges fade when
 * pills are hidden, and then "⋯ N" opens the tab switcher as a popover. "+" opens an empty tab.
 * Phones and narrow windows show `TabCounter` in the search bar instead.
 * Hidden while the only tab is empty: there is nothing to keep.
 */
export function TabBar() {
  const layout = useTabLayout();
  const tabs = useTabsStore((s) => s.tabs);
  const activeId = useTabsStore((s) => s.activeId);
  const activate = useTabsStore((s) => s.activate);
  const close = useTabsStore((s) => s.close);
  const galaxy = useGalaxyStore((s) => s.galaxy);
  const strip = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLElement>(null);
  const more = useRef<HTMLButtonElement>(null);
  const [fades, setFades] = useState<EdgeFades>(NO_FADES);
  const [popAt, setPopAt] = useState<CSSProperties | null>(null);
  const visible = layout === 'strip' && showsTabs({ tabs, activeId });

  /** Reads the strip's overflow; updates state only on a change. */
  const measure = useCallback(() => {
    const el = strip.current;
    if (!el) return;
    const next = edgeFades(el.scrollLeft, el.scrollWidth, el.clientWidth);
    setFades((f) => (f.overflow === next.overflow && f.start === next.start && f.end === next.end ? f : next));
  }, []);

  /** Scrolls the strip so the active pill is fully in view, clear of the fades. */
  const reveal = useCallback(() => {
    const el = strip.current;
    const pill = el?.querySelector<HTMLElement>('.tab-pill.on');
    if (!el || !pill) return;
    const left = revealScroll(
      { start: pill.offsetLeft, end: pill.offsetLeft + pill.offsetWidth },
      { scroll: el.scrollLeft, width: el.clientWidth, max: el.scrollWidth - el.clientWidth },
      FADE_PX,
    );
    if (left !== el.scrollLeft) el.scrollLeft = left;
    measure();
  }, [measure]);

  // On every active change, tab change and first show (page load).
  useLayoutEffect(() => {
    if (visible) reveal();
  }, [visible, activeId, tabs, reveal]);

  // Size changes (window resize, fonts loaded, "⋯ N" shown) can hide the active pill again.
  useEffect(() => {
    const el = strip.current;
    if (!visible || !el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(reveal);
    ro.observe(el);
    for (const pill of el.children) ro.observe(pill);
    return () => ro.disconnect();
  }, [visible, tabs, reveal]);

  // The popover closes when the strip goes away (window narrowed, last tab closed).
  useEffect(() => {
    if (!visible) setPopAt(null);
  }, [visible]);

  const closePop = useCallback((focusBack: boolean) => {
    setPopAt(null);
    if (focusBack) more.current?.focus();
  }, []);

  if (!visible) return null;

  const tabButtons = () => Array.from(strip.current?.querySelectorAll<HTMLElement>('[role="tab"]') ?? []);

  /** Closes a tab; if it held the focus, the focus goes to the tab that is now active. */
  const closeAndRefocus = (id: string, hadFocus: boolean) => {
    close(id);
    if (!hadFocus) return;
    const next = useTabsStore.getState().activeId;
    requestAnimationFrame(() => document.getElementById(`tab-${next}`)?.focus());
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Ctrl/Cmd/Alt shortcuts belong to the browser (e.g. Ctrl+1 switches browser tabs).
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const buttons = tabButtons();
    const i = buttons.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    const move = MOVES[e.key];
    if (move) {
      e.preventDefault();
      buttons[move(i, buttons.length)]?.focus();
    } else if (e.key === 'Delete') {
      e.preventDefault();
      closeAndRefocus(tabs[i]!.id, true);
    }
  };

  // A vertical mouse wheel scrolls the strip sideways (it has no vertical scroll).
  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (strip.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) strip.current.scrollLeft += e.deltaY;
  };

  const togglePop = () => {
    if (popAt) return closePop(false);
    const r = rail.current?.getBoundingClientRect();
    if (r) setPopAt({ '--pop-top': `${r.bottom + 8}px`, '--pop-right': `${Math.max(8, window.innerWidth - r.right)}px` } as CSSProperties);
  };

  const fadeClass = `${fades.start ? ' fade-start' : ''}${fades.end ? ' fade-end' : ''}`;
  return (
    <nav ref={rail} className="tab-rail panel" aria-label="Tabs">
      <div
        className={`tab-strip${fadeClass}`}
        role="tablist"
        aria-label="Open views"
        ref={strip}
        onKeyDown={onKeyDown}
        onScroll={measure}
        onWheel={onWheel}
      >
        {tabs.map((tab) => {
          const label = tabLabel(tab, galaxy);
          const active = tab.id === activeId;
          // A reader tab is labelled in Latin script ("Al-Baqara 2:17"), even with a root selected.
          const arabic = tab.reader === null && tab.selectedId !== null;
          return (
            <div key={tab.id} className={`tab-pill${active ? ' on' : ''}`}>
              <button
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                className="tab-main"
                // Arabic: the transliteration. Latin: the whole label, which the pill may cut off.
                title={arabic ? (galaxy ? galaxy.roots[tab.selectedId!]?.tr : undefined) : label}
                onClick={() => activate(tab.id)}
                // Middle-click closes a tab, as in browsers.
                onAuxClick={(e) => e.button === 1 && closeAndRefocus(tab.id, false)}
                onMouseDown={(e) => e.button === 1 && e.preventDefault()}
              >
                <span lang={arabic ? 'ar' : undefined} dir={arabic ? 'rtl' : undefined}>
                  {label}
                </span>
              </button>
              {/* Out of the Tab order: Delete closes the focused tab from the keyboard. */}
              <button
                type="button"
                className="tab-close"
                tabIndex={-1}
                aria-label={`Close tab ${label}`}
                onClick={() => closeAndRefocus(tab.id, false)}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      {fades.overflow && (
        <>
          <span className="tab-sep" aria-hidden="true" />
          <button
            ref={more}
            type="button"
            className="tab-more"
            aria-label={`All tabs (${tabs.length})`}
            title="All tabs"
            aria-haspopup="dialog"
            aria-expanded={popAt !== null}
            onClick={togglePop}
          >
            <i aria-hidden="true">⋯</i>
            {tabs.length}
          </button>
        </>
      )}
      <button type="button" className="tab-new" aria-label="New tab" title="New tab" onClick={openEmptyTab}>
        +
      </button>
      {popAt && <TabSwitcher variant="popover" onClose={closePop} style={popAt} ignore={more} />}
    </nav>
  );
}
