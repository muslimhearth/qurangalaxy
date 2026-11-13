import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three/webgpu';
import { useGalaxyStore } from '../state/store';
import { writeEdgeEnds } from './focus/apply';
import type { FocusState } from './focus/state';
import { edgeColors, focusOf } from './highlight';
import type { IntroState } from './intro/state';
import type { SceneModel } from './model';

/** Seconds the links take to fade in after the intro. */
const FADE_IN = 1.5;

/**
 * All edges as faint additive line segments in one geometry. Hidden during the intro, then fade in.
 * Line ends follow the stars that the focus glide moves.
 */
export function Links({ model, intro, focus }: { model: SceneModel; intro: IntroState; focus: FocusState }) {
  const edges = useGalaxyStore((s) => s.galaxy!.edges);
  const selectedId = useGalaxyStore((s) => s.selectedId);
  const hoveredId = useGalaxyStore((s) => s.hoveredId);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    // A copy: the glide moves line ends, the model keeps the galaxy positions.
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(model.edgePositions), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(model.edgePositions.length), 3));
    return g;
  }, [model]);
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);

  const material = useMemo(
    () =>
      new THREE.LineBasicNodeMaterial({
        vertexColors: true,
        transparent: true,
        // Additive: overlapping lines brighten, and black means invisible.
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  // Recolor only when the focus changes.
  useLayoutEffect(() => {
    const attr = geometry.getAttribute('color') as THREE.BufferAttribute;
    attr.array.set(edgeColors(edges, model.baseColors, model.adjacency, focusOf(selectedId, hoveredId)));
    attr.needsUpdate = true;
  }, [geometry, edges, model, selectedId, hoveredId]);

  // Keep the line ends on the stars the glide moved this frame.
  useFrame(() => {
    if (!focus.glide.movedCount) return;
    const attr = geometry.getAttribute('position') as THREE.BufferAttribute;
    writeEdgeEnds(attr.array as Float32Array, edges, model.adjacency, focus.glide);
    attr.needsUpdate = true;
  });

  const lines = useRef<THREE.LineSegments>(null);
  useLayoutEffect(() => {
    material.opacity = intro.clock.done ? 1 : 0;
  }, [material, intro]);
  // Intro time when the fade started; skipped intros show the links at once.
  const fadeFrom = useRef<number | null>(intro.played ? null : -Infinity);
  useFrame(({ clock }) => {
    const l = lines.current;
    if (!l || material.opacity === 1) return;
    if (!intro.clock.done) {
      l.visible = false;
      return;
    }
    fadeFrom.current ??= clock.elapsedTime;
    const t = Math.min(1, (clock.elapsedTime - fadeFrom.current) / FADE_IN);
    material.opacity = t * t; // ease in: the lines appear softly
    l.visible = true;
  });

  return <lineSegments ref={lines} geometry={geometry} material={material} visible={!intro.played} />;
}
