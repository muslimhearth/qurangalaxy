import { CameraControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { PerspectiveCamera } from 'three';
import type { Vec3 } from '../data/types';
import { useGalaxyStore } from '../state/store';
import { fitDistance, flyToPose, focusSphere, idleRotation } from './camera';
import type { SceneModel } from './model';

/** Orbit/zoom controls, fly-to on selection and slow idle auto-rotate. */
export function CameraRig({ model }: { model: SceneModel }) {
  const controls = useRef<CameraControls>(null);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const roots = useGalaxyStore((s) => s.galaxy!.roots);
  const selectedId = useGalaxyStore((s) => s.selectedId);
  const interacting = useRef(false);
  const lastInteraction = useRef(0);
  const clock = useThree((s) => s.clock);

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
    const pose = flyToPose(sphere, pos, target, camera.fov, camera.aspect);
    void c.setLookAt(...pose.position, ...pose.target, true);
    lastInteraction.current = clock.elapsedTime;
  }, [selectedId, roots, model, camera, clock]);

  useFrame((_, dt) => {
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
