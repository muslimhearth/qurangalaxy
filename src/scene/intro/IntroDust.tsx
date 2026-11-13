import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three/webgpu';
import { color, float, instancedBufferAttribute, sin, smoothstep, uniform, uv, vec2 } from 'three/tsl';
import type { DustPlan } from './plan';
import type { IntroState } from './state';
import { INTRO } from './timeline';

/** Per-instance attribute node with its real vector type (the TSL typings return Node<string>). */
function attr<T extends 'vec2' | 'vec3'>(array: Float32Array, itemSize: number, type: T) {
  return instancedBufferAttribute(new THREE.InstancedBufferAttribute(array, itemSize), type) as unknown as THREE.Node<T>;
}

/** Pale gold, like the focus label: warm, calm, and apart from the cluster colors. */
const DUST_COLOR = '#f5dfa4';
/** Peak dust opacity: a hint of the words, not a sign. */
const DUST_ALPHA = 0.6;

/**
 * Faint calligraphy of «القرآن الكريم» made of tiny glowing specks inside the galaxy.
 * All motion runs on the GPU from one time uniform: the specks light up from right to left,
 * twinkle, then drift apart and fade while the stars settle.
 */
export function IntroDust({ dust, intro, size }: { dust: DustPlan; intro: IntroState; size: number }) {
  const n = dust.position.length / 3;
  const time = useMemo(() => uniform(0), []);

  const material = useMemo(() => {
    const m = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const pos = attr<'vec3'>(dust.position, 3, 'vec3');
    const drift = attr<'vec3'>(dust.drift, 3, 'vec3');
    const timing = attr<'vec2'>(dust.timing, 2, 'vec2');
    const delay = timing.x;
    const phase = timing.y;
    // Same timing as the stars: light up with the wave, dissolve with the morph.
    const appear = smoothstep(0, 1, time.sub(delay.mul(INTRO.appear / INTRO.wave / 2)).div(INTRO.appear / 2));
    const dissolve = smoothstep(0, 1, time.sub(INTRO.appear + INTRO.hold).sub(delay).div(INTRO.morph - INTRO.wave));
    const shimmer = float(0.75).add(sin(time.mul(2.1).add(phase)).mul(0.25));
    m.positionNode = pos.add(drift.mul(dissolve));
    m.scaleNode = float(size * 1.1).mul(shimmer);
    // Soft round speck.
    const dot = smoothstep(0.5, 0.0, uv().sub(vec2(0.5)).length());
    m.colorNode = color(DUST_COLOR);
    m.opacityNode = dot.mul(appear).mul(float(1).sub(dissolve)).mul(shimmer).mul(DUST_ALPHA);
    return m;
  }, [dust, size, time]);
  useLayoutEffect(() => () => material.dispose(), [material]);

  const sprite = useMemo(() => {
    const s = new THREE.Sprite(material);
    s.count = n;
    s.frustumCulled = false; // positions come from the shader
    return s;
  }, [material, n]);

  useFrame(() => {
    time.value = intro.clock.t;
  });

  return <primitive object={sprite} />;
}
