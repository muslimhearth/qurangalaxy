import { describe, expect, it } from 'vitest';
import { forceAnchor, type AnchoredNode } from './anchorForce';

describe('forceAnchor', () => {
  it('pulls each node toward its anchor in proportion to strength and alpha', () => {
    const nodes: AnchoredNode[] = [
      { x: 10, y: 0, z: 0, vx: 0, vy: 0, vz: 0, anchor: [0, 0, 0], pull: 0.5 },
      { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, anchor: [0, 4, -2], pull: 1 },
    ];
    const force = forceAnchor<AnchoredNode>();
    force.initialize!(nodes, () => 0.5, 3);
    force(0.5);
    expect([nodes[0]!.vx, nodes[0]!.vy, nodes[0]!.vz]).toEqual([-2.5, 0, 0]);
    expect([nodes[1]!.vx, nodes[1]!.vy, nodes[1]!.vz]).toEqual([0, 2, -1]);
  });
});
