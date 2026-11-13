import { GalaxyScene } from './scene/GalaxyScene';
import { Overlay } from './ui/Overlay';
import { useLoadGalaxy } from './data/useLoadGalaxy';

/** Root component: loads the data, then layers the 2D UI over the 3D scene. */
export function App() {
  useLoadGalaxy();
  return (
    <>
      <GalaxyScene />
      <Overlay />
    </>
  );
}
