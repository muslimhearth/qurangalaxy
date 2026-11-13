import { Canvas } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { useGalaxyStore } from '../state/store';
import { BackgroundStars } from './BackgroundStars';
import { Bloom } from './Bloom';
import { CameraRig } from './CameraRig';
import { IntroDriver } from './intro/IntroDriver';
import { introForPageLoad } from './intro/state';
import { LabelLayer, LabelTracker, type LabelAnchors } from './Labels';
import { Links } from './Links';
import { buildSceneModel } from './model';
import { createRenderer } from './renderer';
import { Stars } from './Stars';
import { TapPicker, type PickFn } from './TapPicker';
import { usePanelInset } from './usePanelInset';

if (import.meta.env.DEV) void import('./devSynthetic').then((m) => m.installSyntheticGalaxy());

// Below the UI overlay, which uses z-index 10.
const fullScreen = { position: 'fixed', inset: 0, zIndex: 0 } as const;

/** Full-screen 3D galaxy of roots: stars, links, labels, camera and glow. */
export function GalaxyScene() {
  const galaxy = useGalaxyStore((s) => s.galaxy);
  const select = useGalaxyStore((s) => s.select);
  const hover = useGalaxyStore((s) => s.hover);
  const model = useMemo(() => (galaxy ? buildSceneModel(galaxy) : null), [galaxy]);
  // One intro per page load: decided when the galaxy first arrives (skip rules read the URL then).
  const intro = useMemo(() => (model ? introForPageLoad() : null), [model]);
  const anchors = useRef<LabelAnchors>({ ids: [], els: new Map() }).current;
  const inset = usePanelInset();
  // Filled by <TapPicker> inside the canvas: finds the star nearest to a tap that hit nothing.
  const pick = useRef<PickFn | null>(null);

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
        onPointerMissed={(e) => {
          clearHover();
          // Stars are tiny at full view: a tap near one (finger-sized radius) still selects it.
          select(pick.current?.(e) ?? null);
        }}
        onPointerLeave={clearHover}
      >
        <color attach="background" args={['#04050b']} />
        {model && intro && (
          <>
            <BackgroundStars radius={model.bounds.radius} />
            <IntroDriver model={model} intro={intro} />
            <Links model={model} intro={intro} />
            <Stars model={model} intro={intro} />
            <TapPicker model={model} intro={intro} pick={pick} />
            <LabelTracker model={model} anchors={anchors} inset={inset} intro={intro} />
            <CameraRig model={model} inset={inset} intro={intro} />
          </>
        )}
        <Bloom />
      </Canvas>
      {model && <LabelLayer model={model} anchors={anchors} />}
    </>
  );
}
