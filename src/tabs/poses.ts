import type { Vec3 } from '../data/types';

/** How the galaxy looked in a tab: camera end pose, focus ring direction and the "Back to" state. */
export interface TabPose {
  position: Vec3;
  target: Vec3;
  /** View direction the focus ring was laid out for, or null when no ring was shown. */
  ringDir: Vec3 | null;
  /** True when the user had moved away from the selection ("Back to …" showed). */
  away: boolean;
}

/** Poses by tab id. In memory only: after a reload a tab flies to its root as before. */
const poses = new Map<string, TabPose>();

const copy = (p: TabPose): TabPose => ({
  position: [...p.position],
  target: [...p.target],
  ringDir: p.ringDir ? [...p.ringDir] : null,
  away: p.away,
});

/** Saves (a copy of) the pose of tab `id`. */
export function savePose(id: string, pose: TabPose): void {
  poses.set(id, copy(pose));
}

/** The saved pose of tab `id`, or undefined for a tab never shown. */
export function getPose(id: string): TabPose | undefined {
  return poses.get(id);
}

/** Drops the poses of tabs not in `ids` (closed tabs). */
export function prunePoses(ids: readonly string[]): void {
  for (const id of poses.keys()) if (!ids.includes(id)) poses.delete(id);
}

/** Tests: forget every pose. */
export function clearPoses(): void {
  poses.clear();
}
