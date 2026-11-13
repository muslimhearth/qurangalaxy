import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, type CSSProperties } from 'react';
import { Vector3 } from 'three';
import { useGalaxyStore } from '../state/store';
import { blockedBoxes, type Inset } from './inset';
import { declutter, labelBox, labelIds, ndcToScreen, type Box } from './labels';
import type { FocusState } from './focus/state';
import type { IntroState } from './intro/state';
import type { SceneModel } from './model';

/** Shared by the layer (fills it) and the tracker (moves the nodes). */
export interface LabelAnchors {
  /** Labeled root ids, highest priority first. */
  ids: number[];
  /** Label DOM nodes by root id. */
  els: Map<number, HTMLDivElement>;
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

/**
 * Arabic root labels for the focus, its neighbors and the most frequent roots.
 * Plain DOM next to the canvas: one React tree, no per-label roots.
 */
export function LabelLayer({ model, anchors }: { model: SceneModel; anchors: LabelAnchors }) {
  const roots = useGalaxyStore((s) => s.galaxy?.roots);
  const selectedId = useGalaxyStore((s) => s.selectedId);
  const hoveredId = useGalaxyStore((s) => s.hoveredId);
  const ids = roots ? labelIds(model.adjacency, model.top, selectedId, hoveredId) : [];
  useLayoutEffect(() => {
    anchors.ids = ids;
  });
  if (!roots) return null;

  return (
    <div className="label-layer" style={layer} aria-hidden>
      {ids.map((id) => (
        <div
          key={id}
          dir="rtl"
          lang="ar"
          style={id === selectedId || id === hoveredId ? focused : base}
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
    for (const id of anchors.ids) {
      const el = anchors.els.get(id);
      if (!el) continue;
      els.push(el);
      if (id * 3 + 2 >= pos.length) {
        boxes.push(null);
        continue;
      }
      // Anchor just above the star's top edge.
      v.set(pos[id * 3]!, pos[id * 3 + 1]! + model.radii[id]! * 1.2, pos[id * 3 + 2]!).project(camera);
      const p = ndcToScreen(v.x, v.y, v.z, size.width, size.height);
      el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
      boxes.push(p.visible ? labelBox(p, labelSize(el)) : null);
    }
    const shown = declutter(boxes, blockedBoxes(inset, size.width, size.height));
    els.forEach((el, i) => (el.style.opacity = shown[i] ? '1' : '0'));
  });
  return null;
}
