import { useGalaxyStore } from '../state/store';
import { useLoadError } from './loadError';
import { useHashSync } from './useHashSync';
import { About } from './About';
import { SearchBox } from './SearchBox';
import { RootPanel } from './RootPanel';
import { HoverHint } from './HoverHint';
import { TabBar } from '../tabs/TabBar';
import { useTabSync } from '../tabs/useTabSync';

/**
 * 2D UI over the full-screen 3D scene. The container lets clicks pass through
 * (`pointer-events: none`); only `.panel` elements catch them.
 */
export function Overlay() {
  const galaxy = useGalaxyStore((s) => s.galaxy);
  const error = useLoadError((s) => s.error);
  useTabSync();
  useHashSync();

  if (error) {
    return (
      <div className="overlay">
        <div className="screen panel" role="alert">
          <h1>Quran Root Galaxy</h1>
          <p>The galaxy could not load.</p>
          <p className="muted">{error}</p>
          <button type="button" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!galaxy) {
    return (
      <div className="overlay">
        <div className="screen panel" role="status">
          <div className="spinner" aria-hidden="true" />
          <p>Loading the galaxy…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay">
      <About />
      <SearchBox />
      <TabBar />
      <RootPanel />
      <HoverHint />
    </div>
  );
}
