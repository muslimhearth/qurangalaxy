import { useCallback, useEffect, useRef, useState } from 'react';
import { useTabLayout } from './layout';
import { showsTabs } from './model';
import { useTabsStore } from './store';
import { TabSwitcher } from './TabSwitcher';

/**
 * Tab counter in the search bar (phones and windows under 1024 px): a rounded square with the
 * number of tabs. A tap opens the tab switcher sheet. When a tab is added (a long-press on a
 * root link), the number pulses once. Hidden while the only tab is empty, like the pill strip.
 */
export function TabCounter() {
  const layout = useTabLayout();
  const tabs = useTabsStore((s) => s.tabs);
  const activeId = useTabsStore((s) => s.activeId);
  const [open, setOpen] = useState(false);
  // Bumped on every added tab; the key restarts the pulse animation.
  const [pulse, setPulse] = useState(0);
  const count = useRef(tabs.length);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (tabs.length > count.current) setPulse((p) => p + 1);
    count.current = tabs.length;
  }, [tabs.length]);

  const visible = layout === 'counter' && showsTabs({ tabs, activeId });
  // A hidden counter (last tab closed, window widened) must not reopen its sheet later.
  useEffect(() => {
    if (!visible) setOpen(false);
  }, [visible]);

  const onClose = useCallback((focusBack: boolean) => {
    setOpen(false);
    if (focusBack) button.current?.focus();
  }, []);

  if (!visible) return null;

  const n = tabs.length;
  return (
    <>
      <button
        ref={button}
        type="button"
        className="search-tool tab-counter"
        aria-label={`Tabs (${n})`}
        title="Tabs"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span key={pulse} className={pulse ? 'pulse' : undefined} onAnimationEnd={() => setPulse(0)}>
          {n}
        </span>
      </button>
      {open && <TabSwitcher variant="sheet" onClose={onClose} />}
    </>
  );
}
