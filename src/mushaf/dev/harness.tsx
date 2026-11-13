/**
 * Dev-only page for the Mushaf view until the main session wires it into App:
 * /src/mushaf/dev/index.html#/root/رحم, optional `?compare=ظلم` for a second root.
 * Renders the real overlay (search, root panel, URL sync) over the mosaic instead of the galaxy.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/amiri-quran/arabic-400.css';
import '@fontsource/noto-naskh-arabic/arabic-400.css';
import '../../styles.css';
import { useLoadGalaxy } from '../../data/useLoadGalaxy';
import { useGalaxyStore } from '../../state/store';
import { Overlay } from '../../ui/Overlay';
import { LayoutToggle } from '../LayoutToggle';
import { MushafView } from '../MushafView';

function Harness() {
  useLoadGalaxy();
  const galaxy = useGalaxyStore((s) => s.galaxy);
  const compare = new URLSearchParams(location.search).get('compare');
  const compareRootId = galaxy?.roots.find((r) => r.ar === compare)?.id;
  return (
    <>
      <MushafView compareRootId={compareRootId} />
      <Overlay />
      {galaxy && (
        <div className="overlay">
          <LayoutToggle value="mushaf" onChange={() => location.assign('/' + location.hash)} />
        </div>
      )}
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
);
