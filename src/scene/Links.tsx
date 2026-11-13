import { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three/webgpu';
import { useGalaxyStore } from '../state/store';
import { edgeColors, focusOf } from './highlight';
import type { SceneModel } from './model';

/** All edges as faint additive line segments in one geometry. */
export function Links({ model }: { model: SceneModel }) {
  const edges = useGalaxyStore((s) => s.galaxy!.edges);
  const selectedId = useGalaxyStore((s) => s.selectedId);
  const hoveredId = useGalaxyStore((s) => s.hoveredId);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(model.edgePositions, 3));
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
    attr.array.set(edgeColors(edges, model.baseColors, focusOf(selectedId, hoveredId)));
    attr.needsUpdate = true;
  }, [geometry, edges, model, selectedId, hoveredId]);

  return <lineSegments geometry={geometry} material={material} />;
}
