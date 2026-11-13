import { CameraControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { PerspectiveCamera } from 'three';
import type { Vec3 } from '../data/types';
import { useGalaxyStore } from '../state/store';
import { damp, fitDistance, flyToPose, focusSphere, idleRotation } from './camera';
import { viewFrame, type Inset } from './inset';
import type { SceneModel } from './model';

/** How fast the view slides aside for the panel (per second). */
const OFFSET_RATE = 6;

/**
 * Orbit/zoom controls, fly-to on selection and slow idle auto-rotate.
 * `inset` is the screen area under the root panel: the view centers in the free area instead.
 */
export function CameraRig({ model, inset }: { model: SceneModel; inset: Inset }) {
  const controls = useRef<CameraControls>(null);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const roots = useGalaxyStore((s) => s.galaxy!.roots);
  const selectedId = useGalaxyStore((s) => s.selectedId);
  const interacting = useRef(false);
  const lastInteraction = useRef(0);
  const clock = useThree((s) => s.clock);
  const size = useThree((s) => s.size);
  const offset = useRef({ x: 0, y: 0 });

  // Frame the whole galaxy when the data loads; size clip planes from its bounds.
  useEffect(() => {
    const { center, radius } = model.bounds;
    camera.near = radius * 0.005;
    camera.far = radius * 30;
    camera.updateProjectionMatrix();
    const d = fitDistance(radius, camera.fov, camera.aspect) * 0.9;
    // Slightly above the equator looks more like a galaxy than a flat side view.
    const c = controls.current!;
    c.setLookAt(center[0], center[1] + d * 0.35, center[2] + d, ...center, false);
    c.minDistance = model.radiusRange.max * 2;
    c.maxDistance = d * 3;
  }, [model, camera]);

  // Fly to the selected root and its neighbors.
  useEffect(() => {
    if (selectedId === null || !roots[selectedId]) return;
    const c = controls.current!;
    const sphere = focusSphere(roots, model.adjacency, selectedId, model.radiusRange.max * 6);
    const pos = c.getPosition(camera.position.clone()).toArray() as Vec3;
    const target = c.getTarget(camera.position.clone()).toArray() as Vec3;
    // Fit the free area next to (or above) the panel, not the whole canvas.
    const frame = viewFrame(camera.fov, size.width, size.height, inset);
    const pose = flyToPose(sphere, pos, target, frame.fov, frame.aspect);
    void c.setLookAt(...pose.position, ...pose.target, true);
    lastInteraction.current = clock.elapsedTime;
  }, [selectedId, roots, model, camera, clock, size, inset]);

  useFrame((_, dt) => {
    // Slide the view center toward the middle of the free area.
    const frame = viewFrame(camera.fov, size.width, size.height, inset);
    const o = offset.current;
    const x = damp(o.x, frame.offsetX, OFFSET_RATE, dt);
    const y = damp(o.y, frame.offsetY, OFFSET_RATE, dt);
    const sizeChanged = camera.view && (camera.view.fullWidth !== size.width || camera.view.fullHeight !== size.height);
    if (x !== o.x || y !== o.y || sizeChanged) {
      o.x = x;
      o.y = y;
      if (x || y) camera.setViewOffset(size.width, size.height, x, y, size.width, size.height);
      else camera.clearViewOffset();
    }

    const angle = idleRotation(interacting.current, clock.elapsedTime, lastInteraction.current, dt);
    if (angle) void controls.current?.rotate(angle, 0, false);
  });

  return (
    <CameraControls
      ref={controls}
      makeDefault
      smoothTime={0.6}
      onControlStart={() => (interacting.current = true)}
      onControlEnd={() => {
        interacting.current = false;
        lastInteraction.current = clock.elapsedTime;
      }}
    />
  );
}
