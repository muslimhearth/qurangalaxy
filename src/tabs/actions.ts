import { useTabsStore } from './store';
import { targetView, toTarget, type TargetLike } from './target';

/**
 * Opens a root or a verse in a new tab (a bare number is a root id). `activate: false` keeps
 * the current tab in front (mouse: middle-click, Ctrl/Cmd-click); `true` switches to it (touch long-press).
 */
export function openInNewTab(target: TargetLike, activate = false): void {
  useTabsStore.getState().open(targetView(toTarget(target)), activate);
}

/** Opens an empty tab, switches to it and puts the cursor in the search field. */
export function openEmptyTab(): void {
  useTabsStore.getState().open();
  document.getElementById('root-search')?.focus();
}
