import { beforeEach, describe, expect, it } from 'vitest';
import { clearPoses, getPose, prunePoses, savePose, type TabPose } from './poses';

const pose = (x: number): TabPose => ({ position: [x, 0, 0], target: [0, 0, 0], ringDir: [0, 0, 1], away: false });

describe('tab camera poses', () => {
  beforeEach(clearPoses);

  it('keeps one pose per tab; a tab never shown has none', () => {
    savePose('a', pose(1));
    savePose('b', pose(2));
    savePose('a', pose(3));
    expect(getPose('a')?.position).toEqual([3, 0, 0]);
    expect(getPose('b')?.position).toEqual([2, 0, 0]);
    expect(getPose('c')).toBeUndefined();
  });

  it('copies the pose, so later changes to the caller’s arrays do not leak in', () => {
    const p = pose(1);
    savePose('a', p);
    p.position[0] = 9;
    expect(getPose('a')?.position[0]).toBe(1);
  });

  it('drops the poses of closed tabs', () => {
    savePose('a', pose(1));
    savePose('b', pose(2));
    prunePoses(['b']);
    expect(getPose('a')).toBeUndefined();
    expect(getPose('b')).toBeDefined();
  });
});
