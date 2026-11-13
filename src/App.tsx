import { lazy, Suspense } from 'react';
import { Overlay } from './ui/Overlay';
import { useLoadGalaxy } from './data/useLoadGalaxy';
import { useGalaxyStore } from './state/store';
import { LayoutToggle } from './mushaf/LayoutToggle';
import { MushafView } from './mushaf/MushafView';

// three.js is most of the bundle; load the scene in its own chunk so the UI paints first.
const GalaxyScene = lazy(() => import('./scene/GalaxyScene').then((m) => ({ default: m.GalaxyScene })));

/** Root component: loads the data, then layers the 2D UI over the 3D scene or the Mushaf mosaic. */
export function App() {
  useLoadGalaxy();
  const galaxy = useGalaxyStore((s) => s.galaxy);
  const layout = useGalaxyStore((s) => s.layout);
  const setLayout = useGalaxyStore((s) => s.setLayout);
  return (
    <>
      {layout === 'mushaf' ? (
        <MushafView />
      ) : (
        <Suspense fallback={null}>
          <GalaxyScene />
        </Suspense>
      )}
      <Overlay />
      {galaxy && (
        // Own click-through layer, so Overlay stays unchanged; the toggle is a .panel and catches clicks.
        <div className="overlay">
          <LayoutToggle value={layout} onChange={setLayout} />
        </div>
      )}
    </>
  );
}
