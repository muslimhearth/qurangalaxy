/** Controls that take the focus with the Tab key. */
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keeps the Tab key inside a dialog: Tab on the last control goes to the first, Shift+Tab on
 * the first goes to the last. Call it from the dialog's keydown handler.
 */
export function trapTab(e: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'preventDefault'>, dialog: HTMLElement): void {
  if (e.key !== 'Tab') return;
  const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.hidden && !el.closest('[hidden]'));
  if (items.length === 0) return;
  const first = items[0]!;
  const last = items[items.length - 1]!;
  const at = document.activeElement;
  const inside = at instanceof Node && dialog.contains(at);
  if (!inside || (e.shiftKey ? at === first : at === last)) {
    e.preventDefault();
    (e.shiftKey && inside ? last : first).focus();
  }
}
