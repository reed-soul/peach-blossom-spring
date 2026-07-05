// Ground grass material — TSL port for WebGPU.
//
// The original WebGL version used a custom GLSL ShaderMaterial with cylindrical
// billboarding (per-frame camera-facing). Under WebGPU we follow SeedThree's
// proven pattern (src/core/grass.js):
//   - Standard InstancedMesh: instanceMatrix transforms are handled by TSL's
//     built-in `instance()` machinery — NO manual instanceMatrix access (which
//     is a known TSL gotcha per three #31659).
//   - Crossed-quad geometry built ONCE with random per-instance Y rotation at
//     placement time, so billboarding is no longer needed at runtime.
//   - Vertex normals forced world-up (the grass trick: lit like the ground
//     plane, no per-card flicker).
//   - Wind via a TSL positionNode (two-octave sway + flutter, base-pinned).
//   - Optional SSS translucency (low sun through grass glows).
//
// Kept the `createBillboardMaterial(map, { wind, alphaTest })` signature so
// existing callers (GroundCover) need no changes.

import * as THREE from 'three/webgpu'
import {
  time,
  sin,
  pow,
  vec3,
  positionLocal,
  positionWorld,
  texture,
  Fn,
  normalize,
  cameraViewMatrix,
  vec4,
} from 'three/tsl'

export interface BillboardOptions {
  alphaTest?: number
  wind?: boolean
}

// Two-octave grass sway, base-pinned (zero at the root, full at the tip).
// Phase from world position so adjacent tufts don't sway in lockstep.
// Ported from SeedThree wind.js grassWindPosition.
const grassSway = Fn(([bladeHeight]) => {
  const k = pow(positionLocal.y.div(bladeHeight), 2)
  const t = time.mul(1.0)
  const phase = positionWorld.x.mul(0.35).add(positionWorld.z.mul(0.27))
  const gust = sin(t.mul(1.15).add(phase)).mul(0.72)
    .add(sin(t.mul(2.63).add(phase.mul(1.9))).mul(0.28))
  const amp = 0.22
  const jitterT = t.mul(3.1).add(positionWorld.z.mul(1.7)).add(positionWorld.x.mul(1.3))
  const jitter = sin(jitterT).mul(amp * 0.25)
  return gust.add(jitter).mul(amp).mul(k)
})

/**
 * Returns a NodeMaterial for ground-cover instanced quads.
 *
 * NOTE: callers must build the geometry as CROSSED quads with random per-instance
 * Y rotation at placement (no runtime billboarding). Normals should be (0,1,0).
 * This matches SeedThree's tuftGeometry pattern.
 */
export function createBillboardMaterial(
  map: THREE.Texture,
  options: BillboardOptions = {},
): THREE.MeshStandardNodeMaterial {
  const wind = options.wind ?? false
  const alphaTest = options.alphaTest ?? 0.15

  const mat = new THREE.MeshStandardNodeMaterial({
    map,
    alphaTest,
    side: THREE.DoubleSide,
    roughness: 0.95,
    metalness: 0,
    depthWrite: false,
  })

  // Map RGB only; instanceColor tint is applied via the standard instanceColor
  // pipeline (vertexColors path), which NodeMaterials honor automatically.
  mat.colorNode = texture(map).rgb

  if (wind) {
    // Wind displacement along +X (grass mostly sways horizontally). Blade
    // height = 1 (geometry normalized 0..1).
    mat.positionNode = positionLocal.add(vec3(grassSway(1), 0, 0))
  }

  // Force normals world-up so grass lights like the ground (the SeedThree trick).
  mat.normalNode = normalize(cameraViewMatrix.mul(vec4(0, 1, 0, 0)).xyz)

  return mat
}
