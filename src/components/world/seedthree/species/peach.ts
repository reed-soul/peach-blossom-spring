// Peach tree (Prunus persica) — 桃花树 preset for the 桃花源 scene.
//
// Adapted from SeedThree's white-oak preset (MIT, Copyright (c) 2026 SkyeShark),
// retuned for Prunus morphology:
//   - Smaller overall scale (orchard-height ornamental, ~6 m vs oak's 13 m)
//   - Open, spreading, vase-like crown (nShape 0 = conical, biased low & wide)
//   - Thin branches (low ratio, high ratioPower → fast child radius falloff)
//   - Long, drooping lateral limbs (positive curve + down-angle)
//   - High branch density at L2/L3 → blossom-bearing tips everywhere
//
// The Weber-Penn `params` field is the only contract the core generators read.
// `foliage` / `bark` / `leaf` are read by the foliage + bark shaders (Phase 3)
// and the texture pipeline (Phase 2). They're declared now so the species is a
// single source of truth.

import type { WeberPennParams } from '../core/weber-penn'

export interface FoliageConfig {
  /** 'leaves' (single-leaf cards at LOD0) — only mode this project uses */
  mode: 'leaves'
  leavesPerBranch: number
  /** petal card length (m) */
  size: number
  sizeVar: number
  /** petal width / length */
  widthRatio: number
  /** shrink toward the branch tip (0..1) */
  taper: number
  /** start foliating this far along the branch */
  startFrac: number
  /** petal pitch off the branch (deg) */
  downAngle: number
  downAngleV: number
  /** gravity droop (deg) — peach petals sag */
  droop: number
  droopV: number
  /** crossed planes per petal card */
  quads: number
  /** luminance-preserving tint (subtle — texture albedo dominates) */
  tint: number
  alphaTest: number
  /** canopy-volume hint for dome-normal shading */
  domeStrength: number
}

export interface SpeciesPreset {
  name: string
  latin: string
  bark: string
  leaf: string
  biome: string
  /** bark tile size (m) — smaller = more tiling detail */
  tileWorldSize: number
  foliage: FoliageConfig
  params: Partial<WeberPennParams>
}

export const peach: SpeciesPreset = {
  name: 'Peach',
  latin: 'Prunus persica',
  bark: 'peach_bark.png',
  leaf: 'peach_blossom.png',
  biome: 'temperate',
  tileWorldSize: 1.2,
  foliage: {
    mode: 'leaves',
    // Peach blossoms sit in dense clusters along secondaries + tips — many
    // petals per branch (vs oak's leaves which are spread evenly).
    leavesPerBranch: 22,
    size: 0.32, // single petal card length — smaller than oak leaf (0.6)
    sizeVar: 0.28,
    widthRatio: 0.7, // broader petals (oak leaf 0.62)
    taper: 0.4,
    startFrac: 0.05, // foliate almost the entire branch (peach blooms along the stem)
    downAngle: 60, // petals angle outward/upward from the twig
    downAngleV: 22,
    droop: 18, // gentle sag (oak 22)
    droopV: 14,
    quads: 2, // crossed planes for volume
    // Tint is a soft pink luminance-preserving wash; the texture albedo carries
    // the real petal color. Phase 3 also adds per-instance 4-color tinting.
    tint: 0xffc8d8,
    alphaTest: 0.4,
    domeStrength: 0.5,
  },
  params: {
    scale: 6,
    scaleV: 1.2, // ~6 m tall, lighter variation than oak
    levels: 3,
    ratio: 0.022, // thin trunk (oak 0.035)
    ratioPower: 1.45, // fast child-radius falloff → slender limbs
    baseSize: 0.32, // bare lower trunk before branching (vase shape)
    shape: 0, // conical crown shape ratio → broad at the base of the canopy
    flare: 0.5, // modest root flare
    attractionUp: 0.45, // limbs spread out more than they reach up
    baseSplits: 0, // single trunk (peach is typically single-stemmed low)
    //            trunk  L1    L2    L3
    length: [1.0, 0.55, 0.48, 0.4], // longer laterals than oak → spreading
    lengthV: [0.0, 0.12, 0.12, 0.1],
    taper: [1.0, 1.0, 1.0, 1.0],
    curveRes: [10, 6, 4, 3],
    curve: [4, 25, 35, 0], // gentle trunk curve; arching laterals
    curveBack: [0, -10, 0, 0], // slight S on scaffold limbs
    curveV: [12, 70, 75, 65], // gnarled branches (peach wood is crooked)
    downAngle: [0, 72, 60, 55], // wide-spreading limbs (oak 68/55/50)
    downAngleV: [0, 18, 20, 20],
    rotate: [0, 137.5, 137.5, 137.5], // golden-angle phyllotaxy
    rotateV: [0, 25, 25, 25],
    branches: [0, 24, 16, 0], // dense L1 + L2 → many blossom-bearing tips
    radialSegments: [12, 8, 5, 4], // smoother trunk, lighter twigs
  },
}
