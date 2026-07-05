// Shared wind system — TSL vertex sway for trees + grass.
//
// Ported verbatim from SeedThree (MIT, Copyright (c) 2026 SkyeShark) src/core/wind.js,
// adapted to TypeScript. The original is already TSL — no rewrite needed, only
// the import path (three/webgpu + three/tsl) and a TypeScript veneer.
//
// One set of uniforms drives every bark + foliage material so the canopy ripples
// coherently and a single useFrame can advance time.
//
// PIPELINE FACT (verified by SeedThree reading the compiled WGSL — do not trust
// the JS setupPosition order): for InstancedMeshes the instance matrix is
// composed into the model transform AFTER positionNode runs. Inside positionNode,
// positionLocal is the RAW quad-local vertex and positionWorld is
// modelWorld·(raw local) — NO instance transform. Consequences for instanced wind:
//   phase     — positionWorld is ~the mesh origin for every instance: all leaves
//               share one phase. Fix: per-instance aAnchorPos; phase from
//               modelWorld·aAnchorPos.
//   direction — offsets added here get instance-ROTATED afterward. Fix:
//               per-instance aWindVec = R⁻¹S⁻¹·windDir.
//   amplitude — offsets get instance-SCALED afterward; aWindVec's /S folds that away.

import { Vector3 } from 'three/webgpu'
import {
  uniform,
  time,
  sin,
  mix,
  normalize,
  positionLocal,
  positionWorld,
  positionGeometry,
  attribute,
  float,
  vec3,
  vec4,
  modelWorldMatrix,
} from 'three/tsl'

export const windStrength = uniform(0.5) // 0..1
export const windSpeed = uniform(1.0) // gust tempo multiplier

// Fixed heading, pre-transformed into each foliage instance's local frame at
// geometry-build time (see leafCards.ts → aWindVec).
export const WIND_DIR = new Vector3(0.85, 0, 0.53).normalize()
const windDir = uniform(WIND_DIR.clone())

// Two-octave sway at an explicit phase-driving world position, so the canopy
// ripples instead of rocking as one rigid body.
function swayAt(phaseWorld: ReturnType<typeof vec3>, phaseScale = 1) {
  const t = time.mul(windSpeed)
  const phase = phaseWorld.x.mul(0.35).add(phaseWorld.z.mul(0.27)).mul(phaseScale)
  return sin(t.mul(1.15).add(phase)).mul(0.72).add(sin(t.mul(2.63).add(phase.mul(1.9))).mul(0.28))
}

// Hero bark cylinders: amplitude from the baked aWind (0 at trunk base → 1 at
// tips). Sway PHASE from the stem CENTERLINE (aStemCenter), not the offset
// surface vertex — otherwise a thick trunk's surface sways on a different phase
// than the centerline-anchored foliage and skirts clip through the bark.
export function barkWindPosition() {
  const amp = windStrength.mul(0.35).mul(attribute('aWind', 'float'))
  const centerWorld = modelWorldMatrix.mul(vec4(attribute('aStemCenter', 'vec3'), 1)).xyz
  return positionLocal.add(windDir.mul(swayAt(centerWorld).mul(amp)))
}

// Foliage cards (always instanced): aWindVec carries
// R⁻¹S⁻¹·windDir × (fork-continuous twig weight at the anchor) — direction,
// downstream-scale compensation, AND amplitude packed into one vec3 (WebGPU's
// 8-vertex-buffer budget). Sway phase from modelWorld·aAnchorPos. Flutter scales
// by leaf-LOCAL height: zero at the anchor.
export function foliageWindPosition() {
  const windLocal = attribute('aWindVec', 'vec3')
  const anchorWorld = modelWorldMatrix.mul(vec4(attribute('aAnchorPos', 'vec3'), 1)).xyz
  const rnd = attribute('aThickness', 'float') // 0.4..1 per instance
  const base = windLocal.mul(swayAt(anchorWorld).mul(windStrength.mul(0.35)))
  const local = positionGeometry.y.max(0.0)
  const flutterT = time.mul(windSpeed).mul(5.2).add(rnd.mul(37.7))
  const flutter = vec3(
    sin(flutterT),
    sin(flutterT.mul(1.31)).mul(0.6),
    sin(flutterT.mul(0.77)),
  )
    .mul(windStrength.mul(0.05))
    .mul(rnd)
    .mul(local)
  return positionLocal.add(base).add(flutter)
}

// Grass blades: bottom pinned, tips bend — quadratic in local height so the
// base never slides off the ground. (Instanced: per-blade rotated bend
// directions and near-uniform phase — reads as natural chaos, so it deliberately
// skips the aWindVec/aAnchorPos machinery.)
export function grassWindPosition(bladeHeight = 1) {
  const k = positionLocal.y.div(float(bladeHeight)).pow(2)
  const amp = windStrength.mul(0.22)
  const gust = swayAt(positionWorld, 2.2).mul(amp)
  const jitterT = time.mul(windSpeed).mul(3.1).add(positionWorld.z.mul(1.7)).add(positionWorld.x.mul(1.3))
  const jitter = sin(jitterT).mul(amp).mul(0.25)
  return positionLocal.add(windDir.mul(gust.add(jitter)).mul(k))
}

// Update hook: advance wind time each frame (called from SeedThreeForest).
export function tickWind(elapsed: number) {
  // time is a built-in TSL uniform auto-advanced by the renderer; windStrength
  // and windSpeed can be mutated here if day/night cycle wants variable wind.
  void elapsed
}
