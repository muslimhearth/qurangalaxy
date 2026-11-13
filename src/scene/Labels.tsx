import { useFrame, useThree } from '@react-three/fiber';
import type { CSSProperties } from 'react';
import { Vector3 } from 'three';
import { useGalaxyStore } from '../state/store';
import { labelIds, ndcToScreen } from './labels';
import type { SceneModel } from './model';

/** Label DOM nodes by root id. The layer fills it; the tracker moves the nodes. */
export type LabelAnchors = Map<number, HTMLDivElement>;

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
  visibility: 'hidden', // until the tracker places it
  fontFamily: "'Noto Naskh Arabic', 'Amiri', 'Geeza Pro', serif",
  fontSize: 15,
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
  if (!roots) return null;
  const ids = labelIds(model.adjacency, model.top, selectedId, hoveredId);

  return (
    <div style={layer} aria-hidden>
      {ids.map((id) => (
        <div
          key={id}
          dir="rtl"
          lang="ar"
          style={id === selectedId || id === hoveredId ? focused : base}
          ref={(el) => {
            if (el) anchors.set(id, el);
            else anchors.delete(id);
          }}
        >
          {roots[id]?.ar}
        </div>
      ))}
    </div>
  );
}

const v = new Vector3();

/** Inside the canvas: moves each label to its star's screen position every frame. */
export function LabelTracker({ model, anchors }: { model: SceneModel; anchors: LabelAnchors }) {
  const roots = useGalaxyStore((s) => s.galaxy!.roots);
  const size = useThree((s) => s.size);
  useFrame(({ camera }) => {
    for (const [id, el] of anchors) {
      const r = roots[id];
      if (!r) continue;
      // Anchor just above the star's top edge.
      v.set(r.pos[0], r.pos[1] + model.radii[id]! * 1.2, r.pos[2]).project(camera);
      const p = ndcToScreen(v.x, v.y, v.z, size.width, size.height);
      el.style.visibility = p.visible ? 'visible' : 'hidden';
      el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
    }
  });
  return null;
}
