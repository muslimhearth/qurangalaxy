import { forceCollide, forceLink, forceManyBody, forceSimulation } from 'd3-force-3d';
import type { Edge, Vec3 } from '../../src/data/types';
import { forceAnchor, type AnchoredNode } from './layout/anchorForce';
import { detectClusters } from './layout/clusters';
import { fibonacciSphere, normalizeToSphere } from './layout/geometry';
import { seededRandom } from './layout/random';

/** Input to the layout step: one node per root. */
export interface LayoutInput {
  /** Word count per node, indexed by root id. */
  counts: number[];
  /** Co-occurrence edges between nodes. */
  edges: Edge[];
}

/** Output of the layout step, indexed by root id. */
export interface LayoutResult {
  positions: Vec3[];
  clusters: number[];
  clusterCount: number;
}

/** Radius of the final layout sphere, in scene units. */
export const LAYOUT_RADIUS = 200;

// Simulation tuning, in simulation units (the result is rescaled at the end).
const ANCHOR_RADIUS = 150;
const START_SPREAD = 20;
const TICKS = 200;
/** Barnes-Hut accuracy. Higher is faster and less exact; 1.5 looks the same at this scale and cuts the cost by about 3x. */
const THETA = 1.5;
/** Links between clusters pull this much weaker than links inside a cluster. */
const CROSS_CLUSTER_LINK = 0.1;

/** Simulation node: anchored node plus its collision radius. */
interface LayoutNode extends AnchoredNode {
  radius: number;
}

/** Simulation link with a precomputed strength and rest length. */
interface LayoutLink {
  source: number | LayoutNode;
  target: number | LayoutNode;
  strength: number;
  distance: number;
}

/**
 * Places roots in 3D and groups them into clusters.
 * Clusters come from Louvain; each cluster is pulled toward an anchor on a sphere,
 * so it forms its own nebula. Frequent roots get a stronger pull and sit near the
 * center of their cluster. Deterministic: all randomness is seeded.
 */
export function layoutGalaxy({ counts, edges }: LayoutInput): LayoutResult {
  const n = counts.length;
  const { clusters, clusterCount } = detectClusters(n, edges);
  if (n <= 1) return { positions: counts.map((): Vec3 => [0, 0, 0]), clusters, clusterCount };

  const nodes = makeNodes(counts, clusters, clusterCount);
  const links = makeLinks(edges, clusters, nodes);

  forceSimulation(nodes, 3)
    .stop()
    .randomSource(seededRandom(2))
    // Cool down fully within TICKS steps (d3 default assumes 300).
    .alphaDecay(1 - Math.pow(0.001, 1 / TICKS))
    .force(
      'link',
      forceLink<LayoutNode, LayoutLink>(links)
        .distance((l) => l.distance)
        .strength((l) => l.strength),
    )
    .force('charge', forceManyBody<LayoutNode>().strength(-20).theta(THETA).distanceMax(60))
    .force('collide', forceCollide<LayoutNode>().radius((d) => d.radius).strength(0.7))
    .force('anchor', forceAnchor<LayoutNode>())
    .tick(TICKS);

  const raw = nodes.map((d): Vec3 => [d.x, d.y, d.z]);
  return { positions: normalizeToSphere(raw, LAYOUT_RADIUS), clusters, clusterCount };
}

/** Builds simulation nodes: start near the cluster anchor, radius and pull from a log of the count. */
function makeNodes(counts: number[], clusters: number[], clusterCount: number): LayoutNode[] {
  const anchors = fibonacciSphere(clusterCount, ANCHOR_RADIUS);
  const rng = seededRandom(3);
  // Log scale: counts range from 1 to ~2,900, so a linear scale would hide most roots.
  const maxLog = Math.log1p(Math.max(...counts, 1));
  return counts.map((count, i) => {
    const t = Math.log1p(Math.max(count, 0)) / maxLog;
    const anchor = anchors[clusters[i]!]!;
    return {
      x: anchor[0] + (rng() - 0.5) * START_SPREAD,
      y: anchor[1] + (rng() - 0.5) * START_SPREAD,
      z: anchor[2] + (rng() - 0.5) * START_SPREAD,
      vx: 0,
      vy: 0,
      vz: 0,
      anchor,
      radius: 1 + 0.8 * Math.log1p(Math.max(count, 0)),
      pull: 0.03 + 0.12 * t,
    };
  });
}

/** Builds simulation links: strength grows with log weight, weaker across clusters. */
function makeLinks(edges: Edge[], clusters: number[], nodes: LayoutNode[]): LayoutLink[] {
  const valid = edges.filter((e) => e.source !== e.target && e.weight > 0);
  const degree = new Array<number>(nodes.length).fill(0);
  for (const e of valid) degree[e.source]!++, degree[e.target]!++;
  const maxLog = Math.log1p(Math.max(...valid.map((e) => e.weight), 1));
  return valid.map((e) => {
    const w = Math.log1p(e.weight) / maxLog;
    // Like d3's default 1/min(degree): hubs do not get dragged around by many links.
    let strength = w / Math.min(degree[e.source]!, degree[e.target]!);
    if (clusters[e.source] !== clusters[e.target]) strength *= CROSS_CLUSTER_LINK;
    return {
      source: e.source,
      target: e.target,
      strength,
      distance: 10 + nodes[e.source]!.radius + nodes[e.target]!.radius,
    };
  });
}
