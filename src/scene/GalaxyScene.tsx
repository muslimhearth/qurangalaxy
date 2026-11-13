import { Canvas } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { useGalaxyStore } from '../state/store';
import { BackgroundStars } from './BackgroundStars';
import { Bloom } from './Bloom';
import { CameraRig } from './CameraRig';
import { LabelLayer, LabelTracker, type LabelAnchors } from './Labels';
import { Links } from './Links';
import { buildSceneModel } from './model';
import { createRenderer } from './renderer';
import { Stars } from './Stars';

if (import.meta.env.DEV) void import('./devSynthetic').then((m) => m.installSyntheticGalaxy());

// Below the UI overlay, which uses z-index 10.
const fullScreen = { position: 'fixed', inset: 0, zIndex: 0 } as const;

/** Full-screen 3D galaxy of roots: stars, links, labels, camera and glow. */
export function GalaxyScene() {
  const galaxy = useGalaxyStore((s) => s.galaxy);
  const select = useGalaxyStore((s) => s.select);
  const hover = useGalaxyStore((s) => s.hover);
  const model = useMemo(() => (galaxy ? buildSceneModel(galaxy) : null), [galaxy]);
  const anchors = useRef<LabelAnchors>(new Map()).current;

  const clearHover = () => {
    if (useGalaxyStore.getState().hoveredId !== null) hover(null);
    document.body.style.cursor = '';
  };

  return (
    <>
      <Canvas
        style={fullScreen}
        gl={createRenderer}
        flat // no tone mapping: keep the palette colors true
        dpr={[1, 2]}
        camera={{ fov: 50, position: [0, 0, 100] }}
        onPointerMissed={() => {
          clearHover();
          select(null);
        }}
        onPointerLeave={clearHover}
      >
        <color attach="background" args={['#04050b']} />
        {model && (
          <>
            <BackgroundStars radius={model.bounds.radius} />
            <Links model={model} />
            <Stars model={model} />
            <LabelTracker model={model} anchors={anchors} />
            <CameraRig model={model} />
          </>
        )}
        <Bloom />
      </Canvas>
      {model && <LabelLayer model={model} anchors={anchors} />}
    </>
  );
}
