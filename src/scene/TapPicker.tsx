import { useThree } from '@react-three/fiber';
import { useEffect, type RefObject } from 'react';
import { Vector3 } from 'three';
import type { FocusState } from './focus/state';
import type { IntroState } from './intro/state';
import type { SceneModel } from './model';
import { nearestOnScreen, tapRadius } from './pick';

/** Finds the root nearest to a click or tap (a MouseEvent/PointerEvent), or null. */
export type PickFn = (e: MouseEvent) => number | null;

const v = new Vector3();

/**
 * Inside the canvas: fills `pick` with a function that projects every star to the screen and
 * returns the one nearest to the event, within a finger-sized radius for touch.
 */
export function TapPicker({
  model,
  intro,
  focus,
  pick,
}: {
  model: SceneModel;
  intro: IntroState;
  focus: FocusState;
  pick: RefObject<PickFn | null>;
}) {
  const camera = useThree((s) => s.camera);
  const canvas = useThree((s) => s.gl.domElement);
  useEffect(() => {
    const n = model.radii.length;
    const screen = new Float32Array(n * 3);
    pick.current = (e) => {
      if (!intro.clock.done) return null; // stars are still moving during the opening
      const r = canvas.getBoundingClientRect();
      // Current star positions: the focus ring moves some stars away from their galaxy places.
      const pos = focus.glide.positions;
      for (let i = 0; i < n; i++) {
        v.set(pos[i * 3]!, pos[i * 3 + 1]!, pos[i * 3 + 2]!).project(camera);
        screen[i * 3] = ((v.x + 1) / 2) * r.width;
        screen[i * 3 + 1] = ((1 - v.y) / 2) * r.height;
        screen[i * 3 + 2] = v.z > -1 && v.z < 1 ? 1 : 0;
      }
      const type = (e as PointerEvent).pointerType ?? 'mouse';
      return nearestOnScreen(screen, e.clientX - r.left, e.clientY - r.top, tapRadius(type));
    };
    return () => {
      pick.current = null;
    };
  }, [model, intro, focus, camera, canvas, pick]);
  return null;
}
