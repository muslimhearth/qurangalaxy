import type { Force, SimNode } from 'd3-force-3d';
import type { Vec3 } from '../../../src/data/types';

/** A simulation node with a target point (its cluster anchor) and a pull strength. */
export interface AnchoredNode extends SimNode {
  vx: number;
  vy: number;
  vz: number;
  anchor: Vec3;
  /** Fraction of the distance to the anchor added to velocity per tick, before alpha. */
  pull: number;
}

/**
 * A d3 force that pulls every node toward its own anchor point.
 * Like d3's forceX/Y/Z, but with a per-node 3D target.
 */
export function forceAnchor<N extends AnchoredNode>(): Force<N> {
  let nodes: N[] = [];
  const force: Force<N> = (alpha) => {
    for (const node of nodes) {
      const k = node.pull * alpha;
      node.vx += (node.anchor[0] - node.x) * k;
      node.vy += (node.anchor[1] - node.y) * k;
      node.vz += (node.anchor[2] - node.z) * k;
    }
  };
  force.initialize = (n) => {
    nodes = n;
  };
  return force;
}
