import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, type CSSProperties } from 'react';
import { Vector3, Vector4, type Camera } from 'three';
import { useGalaxyStore } from '../state/store';
import { faintLabelBox, faintLabelIds, freeRect, type Clip } from './edgeLabels';
import { blockedBoxes, type Inset } from './inset';
import { declutter, LABEL_LIFT, labelBox, labelIds, ndcToScreen, type Box } from './labels';
import type { FocusState } from './focus/state';
import type { IntroState } from './intro/state';
import type { SceneModel } from './model';

/** Shared by the layer (fills it) and the tracker (moves the nodes). */
export interface LabelAnchors {
  /** Labeled root ids, highest priority first. */
  ids: number[];
  /** Label DOM nodes by root id. */
  els: Map<number, HTMLDivElement>;
  /** Ids of faint-link labels: drawn at the link's far end, or pinned at the edge of the free area. */
  faint: Set<number>;
  /** The selected root: where the faint links start. */
  from: number | null;
}

const layer: CSSProperties = {
  position: 'fixed',
  inset: 0,
  overflow: 'hidden',
  // Above the canvas, below the UI overlay (z-index 10). Never catches pointer events.
  zIndex: 1,
  pointerEvents: 'none',
};
const base: CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  opacity: 0, // until the tracker places it
  transition: 'opacity 0.25s',
  fontFamily: "'Noto Naskh Arabic', 'Amiri', 'Geeza Pro', serif",
  fontSize: 15,
  // Tight line box: the root letters carry no vowel marks, and smaller boxes let more labels fit.
  lineHeight: 1.3,
  color: 'rgba(232, 230, 240, 0.85)',
  textShadow: '0 0 6px #04050b, 0 0 2px #04050b',
  whiteSpace: 'nowrap',
  userSelect: 'none',
  willChange: 'transform',
};
const focused: CSSProperties = { ...base, fontSize: 20, color: '#f2c76e' };
// Faint links: smaller and dimmer than the ring labels, as their lines are.
const faintStyle: CSSProperties = { ...base, fontSize: 13, color: 'rgba(200, 204, 230, 0.7)' };

/**
 * Arabic root labels for the focus, its neighbors and the most frequent roots; with a selection,
 * also the far ends of its faint links (lowest priority). Plain DOM next to the canvas: one React
 * tree, no per-label roots.
 */
export function LabelLayer({ model, anchors }: { model: SceneModel; anchors: LabelAnchors }) {
  const roots = useGalaxyStore((s) => s.galaxy?.roots);
  const selectedId = useGalaxyStore((s) => s.selectedId);
  const hoveredId = useGalaxyStore((s) => s.hoveredId);
  const main = roots ? labelIds(model.adjacency, model.top, selectedId, hoveredId) : [];
  const faint = roots ? faintLabelIds(model.adjacency, selectedId).filter((id) => !main.includes(id)) : [];
  const ids = [...main, ...faint];
  useLayoutEffect(() => {
    anchors.ids = ids;
    anchors.faint = new Set(faint);
    anchors.from = selectedId;
  });
  if (!roots) return null;

  return (
    <div className="label-layer" style={layer} aria-hidden>
      {ids.map((id) => (
        <div
          key={id}
          dir="rtl"
          lang="ar"
          style={id === selectedId || id === hoveredId ? focused : faint.includes(id) ? faintStyle : base}
          ref={(el) => {
            if (el) anchors.els.set(id, el);
            else anchors.els.delete(id);
          }}
        >
          {roots[id]?.ar}
        </div>
      ))}
    </div>
  );
}

const v = new Vector3();
const c4 = new Vector4();

/** Clip-space position of a scene point (before the divide by w). */
function toClip(x: number, y: number, z: number, camera: Camera): Clip {
  c4.set(x, y, z, 1).applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);
  return { x: c4.x, y: c4.y, w: c4.w };
}

/** Label sizes in pixels, re-measured only when a label's font size changes. */
const sizes = new WeakMap<HTMLElement, { font: string; w: number; h: number }>();
function labelSize(el: HTMLElement) {
  let s = sizes.get(el);
  if (!s || s.font !== el.style.fontSize) {
    s = { font: el.style.fontSize, w: el.offsetWidth, h: el.offsetHeight };
    sizes.set(el, s);
  }
  return s;
}

/**
 * Inside the canvas: moves each label to its star's screen position every frame,
 * then shows only labels that do not collide with a higher-priority label or the panel.
 */
export function LabelTracker({
  model,
  anchors,
  inset,
  intro,
  focus,
}: {
  model: SceneModel;
  anchors: LabelAnchors;
  inset: Inset;
  intro: IntroState;
  focus: FocusState;
}) {
  const size = useThree((s) => s.size);
  useFrame(({ camera }) => {
    // Stars are not at their places yet: keep every label hidden.
    if (!intro.clock.done) return;
    const els: HTMLDivElement[] = [];
    const boxes: (Box | null)[] = [];
    // Current star positions: the focus ring moves some stars away from their galaxy places.
    const pos = focus.glide.positions;
    const free = freeRect(inset, size.width, size.height);
    const from = anchors.from;
    const fromClip =
      from !== null && from * 3 + 2 < pos.length ? toClip(pos[from * 3]!, pos[from * 3 + 1]!, pos[from * 3 + 2]!, camera) : null;
    for (const id of anchors.ids) {
      const el = anchors.els.get(id);
      if (!el) continue;
      els.push(el);
      if (id * 3 + 2 >= pos.length) {
        boxes.push(null);
        continue;
      }
      const lift = model.radii[id]! * LABEL_LIFT;
      if (anchors.faint.has(id)) {
        // Faint link: label at its far end, or where the line leaves the free area.
        const to = toClip(pos[id * 3]!, pos[id * 3 + 1]! + lift, pos[id * 3 + 2]!, camera);
        const box = fromClip && faintLabelBox(fromClip, to, labelSize(el), size, free);
        if (box) el.style.transform = `translate(${box.x}px, ${box.y}px)`;
        boxes.push(box);
        continue;
      }
      // Anchor just above the star's top edge.
      v.set(pos[id * 3]!, pos[id * 3 + 1]! + lift, pos[id * 3 + 2]!).project(camera);
      const p = ndcToScreen(v.x, v.y, v.z, size.width, size.height);
      el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
      boxes.push(p.visible ? labelBox(p, labelSize(el)) : null);
    }
    const shown = declutter(boxes, blockedBoxes(inset, size.width, size.height));

    els.forEach((el, i) => (el.style.opacity = shown[i] ? '1' : '0'));
  });
  return null;
}
