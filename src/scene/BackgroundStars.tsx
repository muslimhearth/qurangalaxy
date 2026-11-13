import { useMemo } from 'react';
import * as THREE from 'three/webgpu';
import { starfield } from './starfield';

/** Distant starfield in a shell far outside the galaxy. Not tied to the data. */
export function BackgroundStars({ radius }: { radius: number }) {
  const geometry = useMemo(() => {
    const { positions, colors } = starfield(4000, radius * 6, radius * 9, 42);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, [radius]);
  const material = useMemo(
    () => new THREE.PointsNodeMaterial({ vertexColors: true, depthWrite: false }),
    [],
  );
  return <points geometry={geometry} material={material} />;
}
