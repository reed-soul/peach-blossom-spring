// Weber & Penn parametric tree skeleton generator (pragmatic subset).
//
// Ported from SeedThree (MIT, Copyright (c) 2026 SkyeShark).
// Produces a flat list of "stems" (trunk + branches at every level). Each stem is
// a spine polyline with a per-point radius; the mesh builder turns each into a
// tapered generalized cylinder. Foliage attaches at terminal-stem tips.
//
// Faithful to the paper where it matters for silhouette: per-level curve, taper,
// phyllotactic child placement, down-angle, Shape-based length distribution, the
// pipe-model radius law, base flare, and vertical tropism (AttractionUp).
//
// Porting notes:
//  - Import math from 'three/webgpu' (original used 'three/webgpu' to avoid mixing
//    entries; Vector3/Quaternion are identical classes).
//  - Replaced the original `arguments[0].flareBase/windBase` reads with explicit
//    named parameters (fragile `arguments` access removed; behavior unchanged).

import { Vector3, Quaternion } from 'three/webgpu'

const UP = new Vector3(0, 1, 0)
const X = new Vector3(1, 0, 0)
const Y = new Vector3(0, 1, 0)

function qAround(axis: Vector3, deg: number): Quaternion {
  return new Quaternion().setFromAxisAngle(axis, (deg * Math.PI) / 180)
}

// Weber-Penn ShapeRatio: distributes child-branch length along the trunk.
function shapeRatio(shape: number, ratio: number): number {
  switch (shape) {
    case 0:
      return 0.2 + 0.8 * ratio // conical
    case 1:
      return 0.2 + 0.8 * Math.sin(Math.PI * ratio) // spherical
    case 2:
      return 0.2 + 0.8 * Math.sin(0.5 * Math.PI * ratio) // hemispherical
    case 3:
      return 1.0 // cylindrical
    case 4:
      return 0.5 + 0.5 * ratio // tapered cylindrical
    case 5:
      return ratio <= 0.7 ? ratio / 0.7 : (1 - ratio) / 0.3 // flame
    case 6:
      return 1.0 - 0.8 * ratio // inverse conical
    case 7:
      return ratio <= 0.7
        ? 0.5 + (0.5 * ratio) / 0.7
        : 0.5 + (0.5 * (1 - ratio)) / 0.3 // tend flame
    default:
      return 1.0
  }
}

// unit_taper from nTaper (0 cylinder, 1 cone, 2 spherical-tip; fractional interp).
function unitTaper(nTaper: number): number {
  if (nTaper < 1) return nTaper
  if (nTaper < 2) return 2 - nTaper
  return 0
}

export interface WeberPennParams {
  seed: string | number
  scale: number
  scaleV: number
  levels: number
  ratio: number
  ratioPower: number
  baseSize: number
  shape: number
  flare: number
  lobes: number
  lobeDepth: number
  attractionUp: number
  attractionUpMinLevel: number
  forceDir: { x: number; y: number; z: number }
  forceStrength: number
  baseSplits: number
  baseSplitAngle: number
  forkChance: number
  forkRadiusKeep?: number
  length: number[]
  lengthV: number[]
  taper: number[]
  curveRes: number[]
  curve: number[]
  curveBack: number[]
  curveV: number[]
  downAngle: number[]
  downAngleV: number[]
  rotate: number[]
  rotateV: number[]
  twist: number[]
  branches: number[]
  tipCluster: number[]
  radialSegments: number[]
}

const DEFAULTS: WeberPennParams = {
  seed: 'tree',
  scale: 12,
  scaleV: 2, // trunk length (m)
  levels: 3,
  ratio: 0.03, // trunk radius / trunk length
  ratioPower: 1.2, // pipe-model child-radius falloff
  baseSize: 0.25, // fraction of trunk that is bare before branching
  shape: 2, // hemispherical crown
  flare: 0.6, // trunk-base swell
  lobes: 0,
  lobeDepth: 0, // ribbed cross-section (cacti)
  attractionUp: 0.5, // vertical tropism strength
  attractionUpMinLevel: 2, // lowest level tropism applies to (1 = forks curl up)
  forceDir: { x: 0, y: 1, z: 0 },
  forceStrength: 0,
  baseSplits: 0, // extra trunks from the base (decurrent multi-leader)
  baseSplitAngle: 20,
  forkChance: 0.82, // dichotomous-fork frequency (tipCluster species)
  length: [1.0, 0.45, 0.4, 0.35],
  lengthV: [0.0, 0.1, 0.1, 0.1],
  taper: [1.0, 1.0, 1.0, 1.0],
  curveRes: [10, 6, 4, 3],
  curve: [10, 40, 40, 0],
  curveBack: [0, 0, 0, 0],
  curveV: [40, 60, 60, 60],
  downAngle: [0, 60, 50, 45],
  downAngleV: [0, 20, 20, 20],
  rotate: [0, 140, 140, 140], // ~golden-angle phyllotaxy
  rotateV: [0, 20, 20, 20],
  twist: [0, 0, 0, 0],
  branches: [0, 30, 12, 0],
  tipCluster: [0, 0, 0, 0],
  radialSegments: [10, 8, 6, 5],
}

export function defaultParams(): WeberPennParams {
  return structuredClone(DEFAULTS)
}

export interface Stem {
  level: number
  points: Vector3[]
  radii: number[]
  orients: Quaternion[]
  winds: number[]
  length: number
  radialSegments: number
  lobes: number
  lobeDepth: number
  maxLevel: number
}

export interface Tip {
  position: Vector3
  orient: Quaternion
  length: number
}

export interface Skeleton {
  stems: Stem[]
  tips: Tip[]
  params: WeberPennParams
}

import type { Rng as RngType } from './rng'

interface BuildStemArgs {
  level: number
  origin: Vector3
  orient: Quaternion
  length: number
  radius: number
  windBase?: number
  flareBase?: number
  p: WeberPennParams
  rng: RngType
  stems: Stem[]
  tips: Tip[]
}

/**
 * @param userParams  overrides merged onto DEFAULTS
 * @param rng  threaded RNG (parent-before-children order)
 */
export function generateSkeleton(
  userParams: Partial<WeberPennParams>,
  rng: RngType,
): Skeleton {
  const p = { ...structuredClone(DEFAULTS), ...userParams } as WeberPennParams
  const stems: Stem[] = []
  const tips: Tip[] = []

  let trunkLen = p.scale + rng.vary(0, p.scaleV)
  // Dichotomous species: the trunk grows to the FIRST fork then splits.
  if ((p.tipCluster?.[1] ?? 0) > 0.5) trunkLen *= 0.45 + 1.1 * (p.baseSize ?? 0.5)
  const trunkRadius = trunkLen * p.ratio

  const nTrunks = 1 + (p.baseSplits | 0)
  for (let t = 0; t < nTrunks; t++) {
    const orient = new Quaternion()
    if (nTrunks > 1) {
      const az = (360 / nTrunks) * t + rng.vary(0, 20)
      orient.multiply(qAround(Y, az))
      orient.multiply(qAround(X, rng.vary(p.baseSplitAngle, 8)))
    }
    buildStem({
      level: 0,
      origin: new Vector3(0, 0, 0),
      orient,
      length: trunkLen,
      radius: trunkRadius,
      p,
      rng,
      stems,
      tips,
    })
  }

  return { stems, tips, params: p }
}

function buildStem(args: BuildStemArgs): void {
  const { level, origin, orient, length, radius, p, rng, stems, tips } = args
  const curveRes = Math.max(2, p.curveRes[level] | 0)
  const segLen = length / curveRes
  const uTaper = unitTaper(p.taper[level])

  const curve = p.curve[level]
  const curveBack = p.curveBack[level]
  const curveV = p.curveV[level]

  const points: Vector3[] = [origin.clone()]
  const radii: number[] = [radius]
  const orients: Quaternion[] = [orient.clone()]

  const o = orient.clone()
  const pos = origin.clone()

  for (let i = 1; i <= curveRes; i++) {
    let segCurve: number
    if (curveBack === 0) segCurve = curve / curveRes
    else segCurve = (i <= curveRes / 2 ? curve : curveBack) / (curveRes / 2)
    segCurve += rng.vary(0, curveV / curveRes)
    o.multiply(qAround(X, segCurve))

    if (level >= (p.attractionUpMinLevel ?? 2) && p.attractionUp !== 0) {
      applyTropism(o, p.attractionUp / curveRes)
    }

    const twist = p.twist?.[level] ?? 0
    if (twist) o.multiply(new Quaternion().setFromAxisAngle(Y, twist))

    if (p.forceStrength)
      applyForce(o, p.forceDir, p.forceStrength, radius * (1 - uTaper * (i / curveRes)))

    const fwd = Y.clone().applyQuaternion(o).normalize()
    pos.addScaledVector(fwd, segLen)

    const z = i / curveRes
    let r = radius * (1 - uTaper * z)
    if (level === p.levels - 1 && (p.taper[level] ?? 1) >= 0.99) r = radius * (1 - z)
    r = Math.max(r, 0.002)

    points.push(pos.clone())
    radii.push(r)
    orients.push(o.clone())
  }

  // Base flare on the trunk: swell the lowest points.
  if (level === 0 && p.flare > 0) {
    for (let i = 0; i < points.length; i++) {
      const z = i / (points.length - 1)
      if (z < 0.15) radii[i] *= 1 + p.flare * (1 - z / 0.15)
    }
  }

  // Fork flare: a fork child's base swells to the PARENT radius at the fork,
  // so diverging arms overlap into one continuous-looking junction.
  const flareBase = args.flareBase
  if (flareBase) {
    for (let i = 0; i < points.length; i++) {
      const z = i / (points.length - 1)
      if (z < 0.35) radii[i] = flareBase * (1 - z / 0.35) + radii[i] * (z / 0.35)
    }
  }

  // Per-point wind weights, CONTINUOUS across forks.
  const windBase = args.windBase ?? 0.05
  const flexGain = [0.3, 0.4, 0.5, 0.55][Math.min(level, 3)]!
  const windTip = Math.min(1, windBase + flexGain)
  const winds = points.map((_, i) =>
    windBase + (windTip - windBase) * Math.pow(i / (points.length - 1), 1.15),
  )

  const stem: Stem = {
    level,
    points,
    radii,
    orients,
    winds,
    length,
    radialSegments: p.radialSegments[level] ?? 6,
    lobes: level === 0 ? p.lobes : 0,
    lobeDepth: p.lobeDepth,
    maxLevel: p.levels - 1,
  }
  stems.push(stem)

  if (level === p.levels - 1) {
    tips.push({
      position: points[points.length - 1]!.clone(),
      orient: orients[orients.length - 1]!.clone(),
      length,
    })
  }

  const childLevel = level + 1
  if (childLevel >= p.levels) return
  const nChildren = childCount(level, childLevel, p, rng)
  if (nChildren <= 0) return

  const offsetStart = level === 0 ? p.baseSize : 0.1
  let azimuth = rng.range(0, 360)
  const tipC = p.tipCluster?.[childLevel] ?? 0
  const forkPlaneAz = rng.range(0, 360)
  const forkRadius = radius * (p.forkRadiusKeep ?? 0.85)

  for (let c = 0; c < nChildren; c++) {
    let frac = offsetStart + (1 - offsetStart) * ((c + 0.5) / nChildren)
    if (tipC > 0) frac = frac * (1 - tipC) + 1.0 * tipC
    const seg = frac * curveRes
    const si = Math.min(curveRes - 1, Math.floor(seg))
    const st = seg - si

    const cpos = points[si]!.clone().lerp(points[si + 1]!, st)
    const cor = orients[si]!.clone().slerp(orients[si + 1]!, st)
    const pradiusHere = radii[si]! * (1 - st) + radii[si + 1]! * st

    const down = p.downAngle[childLevel] + rng.vary(0, p.downAngleV[childLevel])
    const cOrient = cor.clone()
    if (tipC > 0.5) {
      if (nChildren === 1) {
        cOrient.multiply(qAround(Y, rng.range(0, 360)))
        cOrient.multiply(qAround(X, rng.vary(0, 7)))
      } else {
        cOrient.multiply(qAround(Y, forkPlaneAz + (360 / nChildren) * c + rng.vary(0, 12)))
        cOrient.multiply(qAround(X, down))
      }
    } else {
      azimuth += p.rotate[childLevel] + rng.vary(0, p.rotateV[childLevel])
      cOrient.multiply(qAround(Y, azimuth))
      cOrient.multiply(qAround(X, down))
    }

    const lenFactor = p.length[childLevel] + rng.vary(0, p.lengthV[childLevel])
    const shapeFrac =
      level === 0 ? shapeRatio(p.shape, 1 - (frac - offsetStart) / (1 - offsetStart)) : 1
    const childLen = Math.max(0.05, length * lenFactor * shapeFrac)
    let childRadius: number
    if (tipC > 0.5) {
      childRadius = (nChildren === 1 ? radius * 0.97 : forkRadius) * (0.94 + 0.12 * rng.next())
    } else {
      const pipeRadius = radius * Math.pow(childLen / length, p.ratioPower)
      childRadius = Math.min(pipeRadius, pradiusHere * 0.9)
    }

    buildStem({
      level: childLevel,
      origin: cpos,
      orient: cOrient,
      length: childLen,
      radius: childRadius,
      windBase: winds[si]! * (1 - st) + winds[si + 1]! * st,
      flareBase: tipC > 0.5 ? pradiusHere : undefined,
      p,
      rng,
      stems,
      tips,
    })
  }
}

function childCount(
  level: number,
  childLevel: number,
  p: WeberPennParams,
  rng: RngType,
): number {
  const base = p.branches[childLevel] ?? 0
  if (base <= 0) return 0
  if ((p.tipCluster?.[childLevel] ?? 0) > 0.5) {
    const fc = p.forkChance ?? 0.82
    const r = rng.next()
    if (r < 1 - fc) return 1
    if (r > 1 - 0.2 * fc) return 3
    return 2
  }
  if (level === 0) return Math.round(base)
  return Math.max(1, Math.round(base * 0.6))
}

function applyForce(
  o: Quaternion,
  dir: { x: number; y: number; z: number },
  strength: number,
  radius: number,
): void {
  const target = new Vector3(dir.x, dir.y, dir.z)
  if (target.lengthSq() < 1e-9) return
  target.normalize()
  const fwd = Y.clone().applyQuaternion(o)
  const axis = new Vector3().crossVectors(fwd, target)
  const sinFull = axis.length()
  if (sinFull < 1e-6) return
  axis.divideScalar(sinFull)
  const fullAngle = Math.atan2(sinFull, fwd.dot(target))
  const step = strength / Math.max(radius, 0.05)
  const clamped = Math.max(-fullAngle, Math.min(fullAngle, step))
  o.premultiply(new Quaternion().setFromAxisAngle(axis, clamped))
}

function applyTropism(o: Quaternion, amount: number): void {
  const fwd = Y.clone().applyQuaternion(o)
  const target = amount >= 0 ? UP : UP.clone().negate()
  const axis = new Vector3().crossVectors(fwd, target)
  if (axis.lengthSq() < 1e-8) return
  axis.normalize()
  const declination = Math.acos(Math.max(-1, Math.min(1, fwd.dot(target))))
  const angle = Math.abs(amount) * declination
  o.premultiply(new Quaternion().setFromAxisAngle(axis, angle))
}
