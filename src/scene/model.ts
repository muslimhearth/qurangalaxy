import type { Galaxy } from '../data/types';
import { boundingSphere, type Sphere } from './bounds';
import { edgePositions, starBaseColors, starMatrices } from './buffers';
import { buildAdjacency, topByCount, type Adjacency } from './neighbors';
import { starRadii, starRadiusRange, type RadiusRange } from './scales';

/** Number of most frequent roots that always show a label. */
export const TOP_LABELS = 20;

/** Everything the scene derives from a galaxy once, at load time. */
export interface SceneModel {
  bounds: Sphere;
  radiusRange: RadiusRange;
  radii: Float32Array;
  matrices: Float32Array;
  baseColors: Float32Array;
  edgePositions: Float32Array;
  adjacency: Adjacency;
  /** Ids of the most frequent roots. */
  top: number[];
}

/** Builds all static scene buffers and lookups for a galaxy. */
export function buildSceneModel(galaxy: Galaxy): SceneModel {
  const { roots, edges } = galaxy;
  const bounds = boundingSphere(roots.map((r) => r.pos));
  const radiusRange = starRadiusRange(bounds.radius, roots.length);
  const radii = starRadii(
    roots.map((r) => r.count),
    radiusRange,
  );
  return {
    bounds,
    radiusRange,
    radii,
    matrices: starMatrices(roots, radii),
    baseColors: starBaseColors(roots),
    edgePositions: edgePositions(roots, edges),
    adjacency: buildAdjacency(roots.length, edges),
    top: topByCount(roots, TOP_LABELS),
  };
}
