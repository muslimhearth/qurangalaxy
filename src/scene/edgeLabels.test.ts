import { describe, expect, it } from 'vitest';
import { buildAdjacency, TOP_LINKS } from './neighbors';
import { edgePin, faintLabelBox, faintLabelIds, freeRect, pinnedBox, segmentEndScreen } from './edgeLabels';

describe('faintLabelIds', () => {
  const n = TOP_LINKS + 4;
  const hub = Array.from({ length: n - 1 }, (_, i) => ({ source: 0, target: i + 1, weight: 1, score: n - i }));
  const adj = buildAdjacency(n, hub);

  it('lists the selected root neighbors past the top links, strongest first', () => {
    expect(faintLabelIds(adj, 0)).toEqual([21, 22, 23]);
  });

  it('is empty without a selection or for an unknown root', () => {
    expect(faintLabelIds(adj, null)).toEqual([]);
    expect(faintLabelIds(adj, 99)).toEqual([]);
  });
});

describe('freeRect', () => {
  it('is the screen minus the panel and the top bar', () => {
    expect(freeRect({ right: 300, bottom: 0, top: 60 }, 1000, 700)).toEqual({ x: 0, y: 60, w: 700, h: 640 });
    expect(freeRect({ right: 0, bottom: 200, top: 0 }, 400, 800)).toEqual({ x: 0, y: 0, w: 400, h: 600 });
  });
});

describe('segmentEndScreen', () => {
  it('projects a point in front of the camera to CSS pixels', () => {
    expect(segmentEndScreen({ x: 0, y: 0, w: 1 }, { x: 0.5, y: 0.5, w: 1 }, 200, 100)).toEqual({ x: 150, y: 25 });
  });

  it('moves a point behind the camera along the line, so it lands on the far side of the start', () => {
    // From the screen center to a point behind the camera and to the right in clip x:
    // the line crosses the camera plane heading right, so the result is far to the right.
    const p = segmentEndScreen({ x: 0, y: 0, w: 1 }, { x: 4, y: 0, w: -1 }, 200, 100)!;
    expect(p.x).toBeGreaterThan(1000);
    expect(p.y).toBeCloseTo(50);
  });

  it('is null when the start is behind the camera', () => {
    expect(segmentEndScreen({ x: 0, y: 0, w: -1 }, { x: 0, y: 0, w: 1 }, 200, 100)).toBeNull();
  });
});

describe('edgePin', () => {
  const rect = { x: 0, y: 0, w: 100, h: 50 };

  it('keeps an end that is inside the rect', () => {
    expect(edgePin({ x: 50, y: 25 }, { x: 80, y: 10 }, rect)).toEqual({ x: 80, y: 10, pinned: false });
  });

  it('pins an end off screen where the line leaves the rect', () => {
    expect(edgePin({ x: 50, y: 25 }, { x: 250, y: 25 }, rect)).toEqual({ x: 100, y: 25, pinned: true });
    // Leaves through the top edge: 25 px up, 12.5 px right, so at x = 62.5.
    const p = edgePin({ x: 50, y: 25 }, { x: 75, y: -25 }, rect);
    expect(p.pinned).toBe(true);
    expect(p.x).toBeCloseTo(62.5);
    expect(p.y).toBeCloseTo(0);
  });

  it('clamps a start outside the rect first', () => {
    expect(edgePin({ x: -10, y: 25 }, { x: -50, y: 25 }, rect)).toEqual({ x: 0, y: 25, pinned: true });
  });
});

describe('faintLabelBox', () => {
  const view = { width: 200, height: 100 };
  const free = { x: 0, y: 0, w: 200, h: 100 };
  const size = { w: 30, h: 20 };
  const center = { x: 0, y: 0, w: 1 };

  it('sits above an end star on screen', () => {
    expect(faintLabelBox(center, { x: 0.5, y: 0, w: 1 }, size, view, free)).toEqual({ x: 135, y: 30, w: 30, h: 20 });
  });

  it('pins at the screen edge when the end star is off screen', () => {
    expect(faintLabelBox(center, { x: 3, y: 0, w: 1 }, size, view, free)).toEqual({ x: 166, y: 40, w: 30, h: 20 });
  });

  it('is null when the selected root is behind the camera', () => {
    expect(faintLabelBox({ x: 0, y: 0, w: -1 }, center, size, view, free)).toBeNull();
  });
});

describe('pinnedBox', () => {
  const rect = { x: 0, y: 60, w: 400, h: 300 };
  const size = { w: 30, h: 20 };

  it('centers the box on the pin and keeps it inside the rect with a margin', () => {
    expect(pinnedBox({ x: 200, y: 200 }, size, rect)).toEqual({ x: 185, y: 190, w: 30, h: 20 });
    expect(pinnedBox({ x: 400, y: 60 }, size, rect)).toEqual({ x: 366, y: 64, w: 30, h: 20 });
    expect(pinnedBox({ x: 0, y: 360 }, size, rect)).toEqual({ x: 4, y: 336, w: 30, h: 20 });
  });
});
