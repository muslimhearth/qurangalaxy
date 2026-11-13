import { CameraControls, CameraControlsImpl } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Plane, Raycaster, Vector2, Vector3, type PerspectiveCamera } from 'three';
import type { Vec3 } from '../data/types';
import { useGalaxyStore } from '../state/store';
import { damp, fitDistance, flyToPose, focusSphere, idleRotation, START_IDLE, zoomToward } from './camera';
import { viewFrame, type Inset } from './inset';
import type { SceneModel } from './model';
import { createWheelClassifier } from './wheel';

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
  // Start as if long idle, so the galaxy turns from the first frame.
  const lastInteraction = useRef(START_IDLE);
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

  // Touchpad-friendly wheel: pinch zooms, two-finger swipe orbits, a mouse wheel zooms.
  const canvas = useThree((s) => s.gl.domElement);
  useEffect(() => {
    const c = controls.current!;
    c.mouseButtons.wheel = CameraControlsImpl.ACTION.NONE; // we handle the wheel ourselves
    c.dollyToCursor = true; // touch pinch zooms toward the fingers
    const classify = createWheelClassifier();
    const ray = new Raycaster();
    const ndc = new Vector2();
    const plane = new Plane();
    const hit = new Vector3();
    const pos = new Vector3();
    const target = new Vector3();
    /** Zooms by `factor` toward the scene point under the screen point (clientX, clientY). */
    const zoom = (factor: number, smooth: boolean, clientX: number, clientY: number) => {
      // Respect min/max distance by limiting the factor.
      const d = Math.min(c.maxDistance, Math.max(c.minDistance, c.distance * factor));
      const f = d / c.distance;
      c.getPosition(pos);
      c.getTarget(target);
      // The pointed point: where the pointer ray meets the plane through the target, facing the camera.
      const r = canvas.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(hit), target);
      const point = ray.ray.intersectPlane(plane, hit) ?? target;
      const pose = zoomToward(pos.toArray() as Vec3, target.toArray() as Vec3, point.toArray() as Vec3, f);
      void c.setLookAt(...pose.position, ...pose.target, smooth);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); // stop page zoom on ctrl + wheel and page scroll
      const intent = classify(e, e.timeStamp);
      if (intent.kind === 'zoom') zoom(intent.factor, !e.ctrlKey, e.clientX, e.clientY);
      else {
        // Same feel as dragging: one canvas height of swipe is one full turn.
        const turn = (2 * Math.PI) / canvas.clientHeight;
        void c.rotate(intent.dx * turn, intent.dy * turn, false);
      }
      lastInteraction.current = clock.elapsedTime;
    };
    // Safari reports trackpad pinches as gesture events with a running scale.
    let lastScale = 1;
    const onGestureStart = (e: Event) => {
      e.preventDefault();
      lastScale = 1;
    };
    const onGestureChange = (e: Event) => {
      e.preventDefault();
      const g = e as Event & { scale: number; clientX: number; clientY: number };
      const scale = g.scale;
      zoom(lastScale / scale, false, g.clientX, g.clientY);
      lastScale = scale;
      lastInteraction.current = clock.elapsedTime;
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('gesturestart', onGestureStart);
    canvas.addEventListener('gesturechange', onGestureChange);
    return () => {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('gesturestart', onGestureStart);
      canvas.removeEventListener('gesturechange', onGestureChange);
    };
  }, [canvas, clock, camera]);

  // Fly to the selected root, framing all its neighbors around it.
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
