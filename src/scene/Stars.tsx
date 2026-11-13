import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three/webgpu';
import { float, normalView, positionViewDirection, vec3 } from 'three/tsl';
import { useGalaxyStore } from '../state/store';
import { focusOf, starColors } from './highlight';
import { writeIntroMatrices } from './intro/plan';
import type { IntroState } from './intro/state';
import type { SceneModel } from './model';

/**
 * All roots as one instanced mesh of spheres, with picking and highlight colors.
 * During the intro the instance matrices animate; picking waits until it ends.
 */
export function Stars({ model, intro }: { model: SceneModel; intro: IntroState }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  // True once the final (galaxy) matrices are in place after the intro.
  const settled = useRef(false);
  const count = model.radii.length;
  const selectedId = useGalaxyStore((s) => s.selectedId);
  const hoveredId = useGalaxyStore((s) => s.hoveredId);
  const hover = useGalaxyStore((s) => s.hover);
  const select = useGalaxyStore((s) => s.select);

  const material = useMemo(() => {
    const m = new THREE.MeshBasicNodeMaterial();
    // Bright core, darker limb: reads as a glowing ball, not a flat disc.
    // The instance color multiplies this factor.
    const facing = normalView.dot(positionViewDirection).clamp(0, 1);
    m.colorNode = vec3(float(0.45).add(facing.pow(1.5).mul(1.0)));
    return m;
  }, []);

  // Static instance data: set once per galaxy.
  useLayoutEffect(() => {
    const mesh = ref.current!;
    mesh.instanceMatrix.array.set(model.matrices);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(model.baseColors), 3);
    // Raycasting uses the bounding sphere; recompute it after moving the instances.
    mesh.computeBoundingSphere();
    settled.current = intro.clock.done;
    mesh.visible = intro.clock.done;
  }, [model, intro]);

  // Intro: write this frame's matrices into the instance buffer (no React render).
  useFrame(() => {
    const mesh = ref.current;
    if (!mesh || settled.current) return;
    const out = mesh.instanceMatrix.array as Float32Array;
    if (intro.clock.done) {
      out.set(model.matrices);
      settled.current = true;
    } else if (intro.plan) {
      writeIntroMatrices(out, model.matrices, intro.plan, intro.clock.t);
    } else return; // still waiting for the font: stay hidden
    mesh.visible = true;
    mesh.instanceMatrix.needsUpdate = true;
  });

  // Colors change only when the focus changes, never per frame.
  useLayoutEffect(() => {
    const attr = ref.current!.instanceColor!;
    attr.array.set(starColors(model.baseColors, model.adjacency, focusOf(selectedId, hoveredId)));
    attr.needsUpdate = true;
  }, [model, selectedId, hoveredId]);

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!intro.clock.done) return;
    e.stopPropagation();
    if (e.instanceId !== undefined && e.instanceId !== useGalaxyStore.getState().hoveredId) {
      hover(e.instanceId);
    }
    document.body.style.cursor = 'pointer';
  };
  const onOut = () => {
    hover(null);
    document.body.style.cursor = '';
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (!intro.clock.done) return;
    e.stopPropagation();
    if (e.instanceId !== undefined) select(e.instanceId);
  };

  return (
    <instancedMesh
      // Remount when the star count changes: InstancedMesh cannot grow.
      key={count}
      ref={ref}
      args={[undefined, material, count]}
      onPointerMove={onMove}
      onPointerOut={onOut}
      onClick={onClick}
    >
      {/* 320 triangles: round enough at star sizes, 4x cheaper than detail 3. */}
      <icosahedronGeometry args={[1, 2]} />
    </instancedMesh>
  );
}
