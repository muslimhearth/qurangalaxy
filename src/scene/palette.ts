import { Color } from 'three';

/**
 * Cluster colors as sRGB hex. Warm gold/amber accents first, then cool tones,
 * all bright enough to read on a near-black background.
 */
export const CLUSTER_PALETTE: readonly string[] = [
  '#f2c76e', // gold
  '#6ec3f2', // sky
  '#f28b6e', // coral
  '#8ef2c2', // mint
  '#c99bf7', // lavender
  '#f2a94e', // amber
  '#6e8ef2', // indigo
  '#f27ab0', // rose
  '#c8e66a', // lime
  '#5fd6d0', // teal
  '#f5e6c4', // ivory
  '#d98a5b', // copper
];

/** Linear RGB triple (0..1), the form three.js shaders expect. */
export type Rgb = [r: number, g: number, b: number];

// Convert once: Color.set() turns sRGB hex into linear values.
const LINEAR: Rgb[] = CLUSTER_PALETTE.map((hex) => {
  const c = new Color(hex);
  return [c.r, c.g, c.b];
});

/** Linear RGB color for a cluster id. Ids wrap around the 12-color palette. */
export function clusterColor(cluster: number): Rgb {
  const n = LINEAR.length;
  const i = ((cluster % n) + n) % n;
  return [...LINEAR[i]!] as Rgb;
}
