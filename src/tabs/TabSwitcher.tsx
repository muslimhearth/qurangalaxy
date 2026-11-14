import { useEffect, useLayoutEffect, useRef, type CSSProperties, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useGalaxyStore } from '../state/store';
import { openEmptyTab } from './actions';
import { tabCaption, tabKind } from './caption';
import { trapTab } from './focusTrap';
import { tabLabel } from './model';
import { useTabsStore } from './store';
import { TabKindIcon } from './TabKindIcon';

/** Props of the tab switcher. */
export interface TabSwitcherProps {
  /** `sheet`: phone bottom sheet over a scrim. `popover`: desktop list under the "⋯ N" button. */
  variant: 'sheet' | 'popover';
  /** Called to close; `focusBack` is true when the opener button should take the focus again. */
  onClose: (focusBack: boolean) => void;
  /** Popover position (CSS custom properties `--pop-top`, `--pop-right`). */
  style?: CSSProperties;
  /** Elements whose presses do not count as "outside" (the opener button). */
  ignore?: React.RefObject<HTMLElement | null>;
}

/**
 * List of all tabs: kind icon, label, caption ("Root · r-ḥ-m · mercy") and × per row, with
 * "+ New tab" in the header. Picking a row switches to that tab and closes the list. The active
 * row is marked and scrolled into view on open. Escape, the scrim or a press outside closes it;
 * the Tab key stays inside. Renders into `document.body`.
 */
export function TabSwitcher({ variant, onClose, style, ignore }: TabSwitcherProps) {
  const tabs = useTabsStore((s) => s.tabs);
  const activeId = useTabsStore((s) => s.activeId);
  const activate = useTabsStore((s) => s.activate);
  const close = useTabsStore((s) => s.close);
  const galaxy = useGalaxyStore((s) => s.galaxy);
  const box = useRef<HTMLElement>(null);
  const sheet = variant === 'sheet';

  // On open: the active row in view (centered on the phone) and focused.
  useLayoutEffect(() => {
    const row = box.current?.querySelector<HTMLElement>('.tab-row.on .tab-row-main');
    row?.closest('li')?.scrollIntoView?.({ block: sheet ? 'center' : 'nearest' });
    row?.focus({ preventScroll: true });
    // Only on open: later changes (a closed row) must not move the list.
  }, []);

  // The popover closes on a press outside it (the sheet has its scrim for that).
  useEffect(() => {
    if (sheet) return;
    const onOutside = (e: Event) => {
      const t = e.target as Node;
      if (!box.current?.contains(t) && !ignore?.current?.contains(t)) onClose(false);
    };
    document.addEventListener('pointerdown', onOutside);
    return () => document.removeEventListener('pointerdown', onOutside);
  }, [sheet, onClose, ignore]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Close only the list, not the panel behind it.
      e.stopPropagation();
      onClose(true);
    } else if (box.current) {
      trapTab(e.nativeEvent, box.current);
    }
  };

  /** Closes a tab; the focus goes to the row now in its place, so the keyboard user stays in the list. */
  const closeRow = (id: string, index: number) => {
    close(id);
    requestAnimationFrame(() => {
      const rows = box.current?.querySelectorAll<HTMLElement>('.tab-row-main');
      if (rows?.length) rows[Math.min(index, rows.length - 1)]!.focus();
    });
  };

  const newTab = () => {
    onClose(false);
    openEmptyTab();
  };

  const n = tabs.length;
  return createPortal(
    <>
      {sheet && <div className="tab-scrim" aria-hidden="true" onPointerDown={() => onClose(true)} />}
      <section
        ref={box}
        className={`tab-switcher ${variant}`}
        role="dialog"
        aria-modal={sheet || undefined}
        aria-label={sheet ? 'Tabs' : 'All tabs'}
        style={style}
        onKeyDown={onKeyDown}
      >
        {sheet && <div className="tab-grab" aria-hidden="true" />}
        <div className="tab-switcher-head">
          <h2>
            <b>{n}</b> {n === 1 ? 'tab' : 'tabs'}
          </h2>
          <span className="tab-switcher-actions">
            <button type="button" className="tab-switcher-new" aria-label="New tab" onClick={newTab}>
              <i aria-hidden="true">+</i> New tab
            </button>
            {sheet && (
              <button type="button" className="tab-switcher-close" aria-label="Close tab list" onClick={() => onClose(true)}>
                ×
              </button>
            )}
          </span>
        </div>
        <ul className="tab-rows">
          {tabs.map((tab, i) => {
            const label = tabLabel(tab, galaxy);
            const kind = tabKind(tab);
            const cap = tabCaption(tab, galaxy);
            const on = tab.id === activeId;
            const arabic = kind === 'root';
            return (
              <li key={tab.id} className={`tab-row${on ? ' on' : ''}`}>
                <button
                  type="button"
                  className="tab-row-main"
                  aria-label={label}
                  aria-describedby={`tab-cap-${tab.id}`}
                  aria-current={on || undefined}
                  onClick={() => {
                    activate(tab.id);
                    onClose(true);
                  }}
                >
                  <span className="tab-kind" title={cap.kind}>
                    <TabKindIcon kind={kind} />
                  </span>
                  <span className="tab-row-text">
                    <span className="tab-row-label" lang={arabic ? 'ar' : undefined} dir={arabic ? 'rtl' : undefined}>
                      {label}
                    </span>
                    <span className="tab-row-caption" id={`tab-cap-${tab.id}`}>
                      <b>{cap.kind}</b>
                      {cap.detail && ` · ${cap.detail}`}
                    </span>
                  </span>
                </button>
                <button type="button" className="tab-row-close" aria-label={`Close tab ${label}`} onClick={() => closeRow(tab.id, i)}>
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </>,
    document.body,
  );
}
