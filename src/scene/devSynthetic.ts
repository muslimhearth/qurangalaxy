import { useGalaxyStore } from '../state/store';
import { syntheticGalaxy } from './synthetic';

/**
 * Dev only (`pnpm dev`, URL `?synthetic`): replaces the loaded galaxy with a
 * real-scale synthetic one (1,700 roots, 12,000 edges; real data has ~11,700) to test performance.
 * GalaxyScene imports this module only when `import.meta.env.DEV` is true,
 * so it never reaches the production bundle.
 */
export function installSyntheticGalaxy(): void {
  if (!new URLSearchParams(location.search).has('synthetic')) return;
  const fake = syntheticGalaxy({ roots: 1700, edges: 12000, clusters: 12, radius: 200, seed: 1 });
  const apply = () => {
    if (useGalaxyStore.getState().galaxy !== fake) useGalaxyStore.getState().setGalaxy(fake);
  };
  // The real loader may set its galaxy later; swap it back each time.
  useGalaxyStore.subscribe(apply);
  apply();
}
