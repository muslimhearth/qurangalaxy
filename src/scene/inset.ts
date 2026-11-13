import type { Box } from './labels';

/**
 * Screen pixels covered by the UI while a root is selected: the root panel on the right (desktop)
 * or at the bottom (phones), and the search bar at the top.
 */
export interface Inset {
  right: number;
  bottom: number;
  top: number;
}

/** No panel open. */
export const NO_INSET: Inset = { right: 0, bottom: 0, top: 0 };

/** Panel position as returned by getBoundingClientRect. */
type Rect = Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom'>;

/**
 * Inset for a panel rectangle in a `width` x `height` viewport. A panel in the right half
 * is a side panel; one starting below the top quarter is a bottom sheet.
 */
export function panelInset(rect: Rect | null, width: number, height: number): Inset {
  if (!rect) return NO_INSET;
  if (rect.left >= width / 2) return { right: Math.round(width - rect.left), bottom: 0, top: 0 };
  if (rect.top >= height / 4) return { right: 0, bottom: Math.round(height - rect.top), top: 0 };
  return NO_INSET;
}

/** Least free height (share of the view) that the top bar must leave below it to count. */
const MIN_FREE = 0.2;

/**
 * Top inset for a bar at the top of the screen (the search bar): its bottom edge, or 0.
 * Also 0 when the bar and the `panel` inset would leave less than a fifth of the `height`
 * (a maximized sheet): framing a sliver would push the camera to extremes.
 */
export function barInset(rect: Rect | null, panel: Inset, height: number): number {
  if (!rect) return 0;
  const top = Math.round(rect.bottom);
  return height - panel.bottom - top >= height * MIN_FREE ? top : 0;
}

/** Camera settings for the part of the screen that the panel leaves free. */
export interface ViewFrame {
  /** Vertical field of view of the free area, in degrees. */
  fov: number;
  /** Width / height of the free area. */
  aspect: number;
  /** Pixels to shift the view so its center is the free area's center (see camera.setViewOffset). */
  offsetX: number;
  offsetY: number;
}

/**
 * Frames the free area of a `width` x `height` view with vertical fov `fovDeg`.
 * The panel keeps the camera's focal length, so the free area sees a smaller angle.
 */
export function viewFrame(fovDeg: number, width: number, height: number, inset: Inset): ViewFrame {
  const freeW = width - inset.right;
  const freeH = height - inset.bottom - inset.top;
  const tanHalf = Math.tan((fovDeg * Math.PI) / 360) * (freeH / height);
  return {
    fov: freeH < height ? (Math.atan(tanHalf) * 360) / Math.PI : fovDeg,
    aspect: freeW / freeH,
    offsetX: inset.right / 2,
    // Positive moves the view center down: the sheet pushes it up, the top bar pushes it down.
    offsetY: (inset.bottom - inset.top) / 2,
  };
}

/** Screen boxes that labels must avoid because the panel covers them. */
export function blockedBoxes(inset: Inset, width: number, height: number): Box[] {
  const boxes: Box[] = [];
  if (inset.right) boxes.push({ x: width - inset.right, y: 0, w: inset.right, h: height });
  if (inset.bottom) boxes.push({ x: 0, y: height - inset.bottom, w: width, h: inset.bottom });
  if (inset.top) boxes.push({ x: 0, y: 0, w: width, h: inset.top });
  return boxes;
}
