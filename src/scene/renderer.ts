import * as THREE from 'three/webgpu';
import { extend } from '@react-three/fiber';

// Register the three/webgpu classes as JSX elements, as R3F 9 documents.
// We skip R3F's ThreeElements type augmentation: it clashes with @types/three 0.187,
// and our JSX uses only core elements (node materials are passed as props).
extend(THREE as any);

/**
 * Async `gl` factory for <Canvas>: a WebGPURenderer. three.js falls back to its
 * WebGL 2 backend by itself when WebGPU is not available.
 */
export async function createRenderer(props: unknown): Promise<THREE.WebGPURenderer> {
  // No canvas MSAA: the bloom RenderPipeline renders into its own multisampled target.
  const renderer = new THREE.WebGPURenderer({ ...(props as object), antialias: false });
  await renderer.init();
  const backend = (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend
    ? 'WebGPU'
    : 'WebGL 2';
  // One line in the console helps when someone reports a rendering problem.
  console.info(`[galaxy] renderer backend: ${backend}`);
  document.documentElement.dataset.renderer = backend;
  return renderer;
}
