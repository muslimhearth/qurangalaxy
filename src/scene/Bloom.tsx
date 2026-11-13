import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three/webgpu';
import { pass } from 'three/tsl';
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js';

/**
 * Bloom post-processing with three/webgpu RenderPipeline. It takes over rendering:
 * a useFrame with priority 1 stops R3F from calling renderer.render itself.
 */
export function Bloom() {
  const gl = useThree((s) => s.gl) as unknown as THREE.WebGPURenderer;
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  const pipeline = useMemo(() => {
    const p = new THREE.RenderPipeline(gl);
    // 2x MSAA: smooth enough lines. 4x dropped a laptop iGPU (Renoir) to ~55 fps
    // with 12k edges; 2x holds 60 fps.
    const scenePass = pass(scene, camera, { samples: 2 });
    const color = scenePass.getTextureNode('output');
    // strength, radius, threshold: only bright star cores glow; faint links stay crisp.
    p.outputNode = color.add(bloom(color, 0.6, 0.4, 0.3));
    return p;
  }, [gl, scene, camera]);
  useEffect(() => () => pipeline.dispose(), [pipeline]);

  useFrame(() => pipeline.render(), 1);
  return null;
}
