import { useTabsStore } from './store';

/**
 * Opens a root in a new tab. `activate: false` keeps the current tab in front
 * (mouse: middle-click, Ctrl/Cmd-click); `true` switches to it (touch long-press).
 */
export function openInNewTab(rootId: number, activate = false): void {
  useTabsStore.getState().open({ selectedId: rootId }, activate);
}

/** Opens an empty tab, switches to it and puts the cursor in the search field. */
export function openEmptyTab(): void {
  useTabsStore.getState().open();
  document.getElementById('root-search')?.focus();
}
