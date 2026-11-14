import { useEffect, useRef, type KeyboardEvent } from 'react';
import { useGalaxyStore } from '../state/store';
import { openEmptyTab } from './actions';
import { activeTab, isEmptyView, tabLabel } from './model';
import { useTabsStore } from './store';

/** Keys that move focus inside the tab list, mapped to the next index. */
const MOVES: Record<string, (i: number, n: number) => number> = {
  ArrowRight: (i, n) => (i + 1) % n,
  ArrowLeft: (i, n) => (i - 1 + n) % n,
  Home: () => 0,
  End: (_, n) => n - 1,
};

/**
 * In-app tabs: `[ حكم × ][ وصي × ][ + ]`. Each tab keeps one view (root and search).
 * Hidden while the only tab is empty: then there is nothing to keep, and `+` would only
 * open another empty tab. It appears as soon as that tab shows something.
 */
export function TabBar() {
  const tabs = useTabsStore((s) => s.tabs);
  const activeId = useTabsStore((s) => s.activeId);
  const activate = useTabsStore((s) => s.activate);
  const close = useTabsStore((s) => s.close);
  const galaxy = useGalaxyStore((s) => s.galaxy);
  const list = useRef<HTMLDivElement>(null);

  // Keep the active tab in view when the bar scrolls sideways.
  useEffect(() => {
    list.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [activeId, tabs.length]);

  if (tabs.length === 1 && isEmptyView(activeTab({ tabs, activeId }))) return null;

  const tabButtons = () => Array.from(list.current?.querySelectorAll<HTMLElement>('[role="tab"]') ?? []);

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

  return (
    <nav className="tab-bar panel" aria-label="Tabs">
      <div className="tab-list" role="tablist" aria-label="Open views" ref={list} onKeyDown={onKeyDown}>
        {tabs.map((tab) => {
          const label = tabLabel(tab, galaxy);
          const active = tab.id === activeId;
          const arabic = tab.selectedId !== null;
          return (
            <div key={tab.id} className={`tab${active ? ' active' : ''}`}>
              <button
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                className="tab-main"
                title={arabic && galaxy ? galaxy.roots[tab.selectedId!]?.tr : undefined}
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
      <button type="button" className="tab-new" aria-label="New tab" title="New tab" onClick={openEmptyTab}>
        +
      </button>
    </nav>
  );
}
