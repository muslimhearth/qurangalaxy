import { useEffect, useRef, type MouseEvent, type PointerEvent } from 'react';
import { openInNewTab } from './actions';
import type { TargetLike } from './target';

/** Touch hold time that opens a new tab. */
export const LONG_PRESS_MS = 500;
/** Finger travel that turns a press into a scroll, not a long-press. */
const MOVE_PX = 10;

/** Event handlers to spread on a root or verse link (chip, search result, bookmark). */
export interface NewTabHandlers {
  onClick: (e: MouseEvent) => void;
  onAuxClick: (e: MouseEvent) => void;
  onMouseDown: (e: MouseEvent) => void;
  onPointerDown: (e: PointerEvent) => void;
  onPointerMove: (e: PointerEvent) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onContextMenu: (e: MouseEvent) => void;
}

/**
 * Root and verse links that also open in a new tab, like browser links:
 * - plain click/tap: `onSelect` (the current tab follows the link);
 * - middle-click, Ctrl-click, Cmd-click: new tab in the background (browsers stay put);
 * - touch long-press: new tab, and switch to it (touch has no other visible feedback).
 * Returns `bind(target, onSelect)`, which gives the handlers for one link. `target` is a
 * `{ root }` or `{ verse }` target, or a bare root id.
 */
export function useNewTabGesture(): (target: TargetLike, onSelect: () => void) => NewTabHandlers {
  const press = useRef<{ timer: number; x: number; y: number; start: number; fire: () => void } | null>(null);
  // Set when a long-press fired, so the click that follows the finger lift is ignored.
  const fired = useRef(false);

  const cancel = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  };
  useEffect(() => cancel, []);

  return (target, onSelect) => ({
    onClick: (e) => {
      if (fired.current) {
        fired.current = false;
        return;
      }
      if (e.ctrlKey || e.metaKey) openInNewTab(target, false);
      else onSelect();
    },
    onAuxClick: (e) => {
      if (e.button !== 1) return;
      e.preventDefault();
      openInNewTab(target, false);
    },
    // Stops the middle-button autoscroll (Windows) from starting on the link.
    onMouseDown: (e) => {
      if (e.button === 1) e.preventDefault();
    },
    onPointerDown: (e) => {
      fired.current = false;
      if (e.pointerType !== 'touch') return;
      cancel();
      const fire = () => {
        press.current = null;
        fired.current = true;
        navigator.vibrate?.(10);
        openInNewTab(target, true);
      };
      const timer = window.setTimeout(fire, LONG_PRESS_MS);
      press.current = { timer, x: e.clientX, y: e.clientY, start: Date.now(), fire };
    },
    onPointerMove: (e) => {
      const p = press.current;
      if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > MOVE_PX) cancel();
    },
    // A busy main thread can run the lift before a due timer: a held press still counts.
    onPointerUp: () => {
      const p = press.current;
      cancel();
      if (p && Date.now() - p.start >= LONG_PRESS_MS) p.fire();
    },
    onPointerCancel: cancel,
    // A held finger opens the system menu on some phones; the long-press replaces it.
    onContextMenu: (e) => {
      if (press.current || fired.current) e.preventDefault();
    },
  });
}
