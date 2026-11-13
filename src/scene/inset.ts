import type { Box } from './labels';

/** Screen pixels covered by the root panel: on the right (desktop) or at the bottom (phones). */
export interface Inset {
  right: number;
  bottom: number;
}

/** No panel open. */
export const NO_INSET: Inset = { right: 0, bottom: 0 };

/** Panel position as returned by getBoundingClientRect. */
type Rect = Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom'>;

/**
 * Inset for a panel rectangle in a `width` x `height` viewport. A panel in the right half
 * is a side panel; one starting below the top quarter is a bottom sheet.
 */
export function panelInset(rect: Rect | null, width: number, height: number): Inset {
  if (!rect) return NO_INSET;
  if (rect.left >= width / 2) return { right: Math.round(width - rect.left), bottom: 0 };
  if (rect.top >= height / 4) return { right: 0, bottom: Math.round(height - rect.top) };
  return NO_INSET;
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
  const freeH = height - inset.bottom;
  const tanHalf = Math.tan((fovDeg * Math.PI) / 360) * (freeH / height);
  return {
    fov: inset.bottom ? (Math.atan(tanHalf) * 360) / Math.PI : fovDeg,
    aspect: freeW / freeH,
    offsetX: inset.right / 2,
    offsetY: inset.bottom / 2,
  };
}

/** Screen boxes that labels must avoid because the panel covers them. */
export function blockedBoxes(inset: Inset, width: number, height: number): Box[] {
  const boxes: Box[] = [];
  if (inset.right) boxes.push({ x: width - inset.right, y: 0, w: inset.right, h: height });
  if (inset.bottom) boxes.push({ x: 0, y: height - inset.bottom, w: width, h: inset.bottom });
  return boxes;
}
