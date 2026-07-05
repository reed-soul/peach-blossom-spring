// Shared wind system uniforms, ported from SeedThree's TSL wind.js
// (MIT, Copyright (c) 2026 SkyeShark) to plain WebGL/GLSL.
//
// Three.js r171's WebGL renderer doesn't have TSL `positionNode`; we inject
// wind as a vertex displacement via MeshStandardMaterial.onBeforeCompile.
//
// One uniforms object is shared across every bark + foliage material so the
// canopy ripples coherently and a single useFrame can advance time.

import * as THREE from 'three/webgpu'

// Fixed world heading for the wind. Pre-transformed into each foliage
// instance's local frame at geometry-build time (see leafCards.ts → aWindVec),
// so this uniform is only consumed by the HERO (non-instanced) bark shader.
export const WIND_DIR = new THREE.Vector3(0.85, 0, 0.53).normalize()

export interface WindUniforms {
  uWindStrength: { value: number }
  uWindSpeed: { value: number }
  uTime: { value: number }
  uWindDir: { value: THREE.Vector3 }
}

export function createWindUniforms(): WindUniforms {
  return {
    uWindStrength: { value: 0.5 }, // 0..1
    uWindSpeed: { value: 1.0 }, // gust tempo multiplier
    uTime: { value: 0 },
    uWindDir: { value: WIND_DIR.clone() },
  }
}

// GLSL snippet: two-octave sway at an explicit world position.
// Ported from wind.js swayAt(): sin(t·1.15+phase)·0.72 + sin(t·2.63+phase·1.9)·0.28
// where phase = worldPos.x·0.35 + worldPos.z·0.27.
//
// Inject this AFTER the caller has declared `uniform float uTime/uWindSpeed`.
// `phaseWorld` must be a world-space vec3 (typically modelMatrix × aStemCenter
// or aAnchorPos — see pipeline note below).
export const SWAY_GLSL = /* glsl */ `
  // Two-octave sway. Returns a scalar along the wind direction.
  float windSwayAt(vec3 phaseWorld) {
    float t = uTime * uWindSpeed;
    float phase = phaseWorld.x * 0.35 + phaseWorld.z * 0.27;
    return sin(t * 1.15 + phase) * 0.72
         + sin(t * 2.63 + phase * 1.9) * 0.28;
  }
`

// PIPELINE FACT (mirrors wind.js's caution block):
// For InstancedMesh the instanceMatrix is applied AFTER the vertex shader's
// position output, so inside the vertex shader:
//   - `position` is the RAW quad-local vertex (no instance transform)
//   - `modelMatrix * position` is the MESH origin for EVERY instance — NOT the
//     leaf's true world position
// Consequences for instanced wind:
//   phase     — must come from modelMatrix × aAnchorPos (per-instance anchor),
//               NOT modelMatrix × position (would be the mesh origin → every
//               leaf shares one phase).
//   direction — offsets added in the vertex shader get instance-ROTATED by the
//               downstream instanceMatrix, so the per-instance aWindVec is
//               pre-baked as R⁻¹S⁻¹·windDir × weight (see leafCards.ts).
//   amplitude — offsets get instance-SCALED; aWindVec's /S folds that away.
//
// For the HERO (non-instanced) bark mesh, `position` IS tree space and
// `modelMatrix × position` IS true world position — so aWind (per-vertex
// weight) + aStemCenter (centerline, for phase) + uWindDir is all we need.
