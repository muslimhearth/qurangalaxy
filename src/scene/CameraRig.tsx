import { CameraControls, CameraControlsImpl } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Plane, Raycaster, Vector2, Vector3, type PerspectiveCamera } from 'three';
import type { Vec3 } from '../data/types';
import { useGalaxyStore } from '../state/store';
import {
  damp,
  fitDistance,
  flyToPose,
  focusSphere,
  IDLE_DELAY,
  idleRotation,
  START_ELEVATION,
  START_FIT,
  START_IDLE,
  zoomToward,
} from './camera';
import type { IntroState } from './intro/state';
import { viewFrame, type Inset } from './inset';
import type { SceneModel } from './model';
import { createWheelClassifier } from './wheel';

/** The user moved the view: with a root selected, offer "Back to …". */
function markAway() {
  const s = useGalaxyStore.getState();
  if (s.selectedId !== null && !s.awayFromSelection) s.setAwayFromSelection(true);
}

/** Easing time (s) of fly-to moves: slow and graceful. */
const FLY_SMOOTH = 0.6;
/**
 * Easing time (s) of pinch, wheel and swipe steps: short, like map apps. Each step eases to
 * its target instead of jumping, so uneven touchpad events feel like one smooth motion.
 */
const GESTURE_SMOOTH = 0.14;

/** How fast the view slides aside for the panel (per second). */
const OFFSET_RATE = 6;

/**
 * Orbit/zoom controls, fly-to on selection and slow idle auto-rotate.
 * `inset` is the screen area under the root panel: the view centers in the free area instead.
 */
export function CameraRig({ model, inset, intro }: { model: SceneModel; inset: Inset; intro: IntroState }) {
  const controls = useRef<CameraControls>(null);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const roots = useGalaxyStore((s) => s.galaxy!.roots);
  const selectedId = useGalaxyStore((s) => s.selectedId);
  // "Back to …" bumps this to replay the fly-to.
  const recenterTick = useGalaxyStore((s) => s.recenterTick);
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
    const d = fitDistance(radius, camera.fov, camera.aspect) * START_FIT;
    // Slightly above the equator looks more like a galaxy than a flat side view.
    const c = controls.current!;
    c.setLookAt(center[0], center[1] + d * START_ELEVATION, center[2] + d, ...center, false);
    c.minDistance = model.radiusRange.max * 2;
    c.maxDistance = d * 3;
  }, [model, camera]);

  // Touchpad-friendly wheel: pinch zooms, two-finger swipe orbits, a mouse wheel zooms.
  const canvas = useThree((s) => s.gl.domElement);
  useEffect(() => {
    const c = controls.current!;
    c.mouseButtons.wheel = CameraControlsImpl.ACTION.NONE; // we handle the wheel ourselves
    c.dollyToCursor = true; // touch pinch zooms toward the fingers
    c.draggingSmoothTime = GESTURE_SMOOTH; // touch drag and pinch ease the same way
    const classify = createWheelClassifier();
    const ray = new Raycaster();
    const ndc = new Vector2();
    const plane = new Plane();
    const hit = new Vector3();
    const pos = new Vector3();
    const target = new Vector3();
    /** Zooms by `factor` toward the scene point under the screen point (clientX, clientY). */
    const zoom = (factor: number, clientX: number, clientY: number) => {
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
      // Targets build on the end of the current ease (getPosition/getTarget), so fast pinches add up.
      c.smoothTime = GESTURE_SMOOTH;
      void c.setLookAt(...pose.position, ...pose.target, true);
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); // stop page zoom on ctrl + wheel and page scroll
      const intent = classify(e, e.timeStamp);
      if (intent.kind === 'zoom') zoom(intent.factor, e.clientX, e.clientY);
      else {
        // Same feel as dragging: one canvas height of swipe is one full turn.
        const turn = (2 * Math.PI) / canvas.clientHeight;
        c.smoothTime = GESTURE_SMOOTH;
        void c.rotate(intent.dx * turn, intent.dy * turn, true);
      }
      lastInteraction.current = clock.elapsedTime;
      markAway();
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
      zoom(lastScale / scale, g.clientX, g.clientY);
      lastScale = scale;
      lastInteraction.current = clock.elapsedTime;
      markAway();
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
    c.smoothTime = FLY_SMOOTH;
    void c.setLookAt(...pose.position, ...pose.target, true);
    lastInteraction.current = clock.elapsedTime;
  }, [selectedId, recenterTick, roots, model, camera, clock, size, inset]);

  // Closing the panel flies back out to the whole galaxy, keeping the current viewing direction.
  const lastSelected = useRef<number | null>(null);
  useEffect(() => {
    const was = lastSelected.current;
    lastSelected.current = selectedId;
    if (selectedId !== null || was === null) return;
    const c = controls.current!;
    const pos = c.getPosition(camera.position.clone()).toArray() as Vec3;
    const target = c.getTarget(camera.position.clone()).toArray() as Vec3;
    const whole = { center: model.bounds.center, radius: model.bounds.radius * START_FIT };
    const pose = flyToPose(whole, pos, target, camera.fov, camera.aspect);
    c.smoothTime = FLY_SMOOTH;
    void c.setLookAt(...pose.position, ...pose.target, true);
    lastInteraction.current = clock.elapsedTime;
  }, [selectedId, model, camera, clock]);

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

    // Hold still while the intro words face the camera; the rotation eases in after it.
    if (!intro.clock.done) lastInteraction.current = clock.elapsedTime - IDLE_DELAY;
    const angle = idleRotation(interacting.current, clock.elapsedTime, lastInteraction.current, dt);
    if (angle) void controls.current?.rotate(angle, 0, false);
  });

  return (
    <CameraControls
      ref={controls}
      makeDefault
      smoothTime={FLY_SMOOTH}
      onControlStart={() => (interacting.current = true)}
      // Only real movement (not a plain tap) counts as moving away from the selection.
      onControl={markAway}
      onControlEnd={() => {
        interacting.current = false;
        lastInteraction.current = clock.elapsedTime;
      }}
    />
  );
}
