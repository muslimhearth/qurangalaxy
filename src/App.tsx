import { lazy, Suspense } from 'react';
import { Overlay } from './ui/Overlay';
import { useLoadGalaxy } from './data/useLoadGalaxy';

// three.js is most of the bundle; load the scene in its own chunk so the UI paints first.
const GalaxyScene = lazy(() => import('./scene/GalaxyScene').then((m) => ({ default: m.GalaxyScene })));

/** Root component: loads the data, then layers the 2D UI over the 3D scene. */
export function App() {
  useLoadGalaxy();
  return (
    <>
      <Suspense fallback={null}>
        <GalaxyScene />
      </Suspense>
      <Overlay />
    </>
  );
}
