import type { Layout } from './LayoutToggle';

/** Hash prefix of the Mushaf layout, e.g. "#/mushaf/root/رحم" or just "#/mushaf". */
const MUSHAF = '#/mushaf';

/** Splits a URL hash into the layout and the root part ("#/mushaf/root/x" → mushaf, "#/root/x"). */
export function splitLayoutHash(hash: string): { layout: Layout; rootHash: string } {
  if (hash === MUSHAF || hash.startsWith(MUSHAF + '/')) {
    const rest = hash.slice(MUSHAF.length);
    return { layout: 'mushaf', rootHash: rest ? '#' + rest : '' };
  }
  return { layout: 'galaxy', rootHash: hash };
}

/** Joins a layout and a root hash ("#/root/x" or "") into a URL hash; the galaxy keeps the old form. */
export function joinLayoutHash(layout: Layout, rootHash: string): string {
  if (layout === 'galaxy') return rootHash;
  return MUSHAF + rootHash.replace(/^#/, '');
}
