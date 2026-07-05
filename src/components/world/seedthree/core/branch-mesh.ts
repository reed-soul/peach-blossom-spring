// Turn a skeleton (list of stems) into a single merged BufferGeometry of tapered
// generalized cylinders — the Weber-Penn "cross-sections connected into a mesh"
// method. Not THREE.TubeGeometry (which can't taper).
//
// Ported from SeedThree (MIT, Copyright (c) 2026 SkyeShark).
//
// Porting notes:
//  - Import from 'three/webgpu' (original used 'three/webgpu'; classes are identical).
//  - Otherwise faithful to the source. Outputs BufferGeometry with attributes:
//    position, normal, uv, aWind (wind weight per vertex),
//    aStemCenter (centerline point per vertex → wind sway phase).

import { BufferGeometry, BufferAttribute, Vector3 } from 'three/webgpu'
import type { Stem } from './weber-penn'

const WORLD_UP = new Vector3(0, 1, 0)
const WORLD_X = new Vector3(1, 0, 0)

function tangentAt(points: Vector3[], i: number, out: Vector3): Vector3 {
  const n = points.length
  if (i === 0) out.copy(points[1]!).sub(points[0]!)
  else if (i === n - 1) out.copy(points[n - 1]!).sub(points[n - 2]!)
  else out.copy(points[i + 1]!).sub(points[i - 1]!)
  if (out.lengthSq() < 1e-10) out.set(0, 1, 0)
  return out.normalize()
}

export interface BuildBranchOpts {
  /** world meters per bark tile repeat */
  tileWorldSize?: number
  /** LOD: scale ring vertex counts (min 3 sides) */
  radialScale?: number
  /** LOD: keep every Nth cross-section */
  ringStride?: number
}

/**
 * @param stems  from generateSkeleton()
 */
export function buildBranchGeometry(stems: Stem[], opts: BuildBranchOpts = {}): BufferGeometry {
  const tileWorldSize = opts.tileWorldSize ?? 1.5
  const radialScale = opts.radialScale ?? 1
  const ringStride = Math.max(1, Math.round(opts.ringStride ?? 1))

  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const winds: number[] = []
  const centers: number[] = [] // stem centerline per vertex → wind sway phase (matches foliage)
  const indices: number[] = []
  let vertBase = 0

  const radial = new Vector3()
  const pos = new Vector3()
  const tan = new Vector3()
  const nrm = new Vector3()
  const bin = new Vector3()

  for (const stem of stems) {
    const { lobes, lobeDepth } = stem
    const seg = Math.max(3, Math.round(stem.radialSegments * radialScale))
    let points = stem.points
    let radii = stem.radii
    let stemWinds: number[] | null = stem.winds ?? null
    if (ringStride > 1 && points.length > 2) {
      const P: Vector3[] = []
      const R: number[] = []
      const W: number[] = []
      for (let i = 0; i < points.length - 1; i += ringStride) {
        P.push(points[i]!)
        R.push(radii[i]!)
        if (stemWinds) W.push(stemWinds[i]!)
      }
      P.push(points[points.length - 1]!)
      R.push(radii[radii.length - 1]!)
      if (stemWinds) {
        W.push(stemWinds[stemWinds.length - 1]!)
        stemWinds = W
      }
      points = P
      radii = R
    }
    const rings = points.length
    const ringVerts = seg + 1 // duplicate seam vertex (last == first around)

    // Rotation-minimizing frame (parallel transport) along the stem.
    const fN: Vector3[] = []
    const fB: Vector3[] = []
    tangentAt(points, 0, tan)
    nrm.crossVectors(tan, WORLD_UP)
    if (nrm.lengthSq() < 1e-6) nrm.crossVectors(tan, WORLD_X)
    nrm.normalize()
    bin.crossVectors(nrm, tan).normalize()
    fN.push(nrm.clone())
    fB.push(bin.clone())
    for (let i = 1; i < rings; i++) {
      tangentAt(points, i, tan)
      nrm.copy(fN[i - 1]!).addScaledVector(tan, -fN[i - 1]!.dot(tan))
      if (nrm.lengthSq() < 1e-8) {
        nrm.crossVectors(tan, WORLD_UP)
        if (nrm.lengthSq() < 1e-6) nrm.crossVectors(tan, WORLD_X)
      }
      nrm.normalize()
      bin.crossVectors(nrm, tan).normalize()
      fN.push(nrm.clone())
      fB.push(bin.clone())
    }

    const refIdx = Math.min(rings - 1, Math.max(0, Math.floor(rings * 0.25)))
    const circumference = 2 * Math.PI * radii[refIdx]!
    const wraps = circumference / tileWorldSize
    const uScale = wraps >= 0.75 ? Math.max(1, Math.round(wraps)) : wraps
    const tileV = Math.max(0.02, circumference / uScale)
    let vAlong = 0
    let lastWind = 0.05
    for (let i = 0; i < rings; i++) {
      if (i > 0) vAlong += points[i]!.distanceTo(points[i - 1]!)
      const v = vAlong / tileV
      const axN = fN[i]!
      const axB = fB[i]!
      const r = radii[i]!

      const alongFrac = i / (rings - 1)
      const levelFrac = stem.maxLevel > 0 ? stem.level / stem.maxLevel : 0
      const wind = stemWinds
        ? stemWinds[i]!
        : Math.min(1, 0.15 + 0.85 * (0.5 * levelFrac + 0.5 * levelFrac * alongFrac + 0.15 * alongFrac))
      lastWind = wind

      for (let j = 0; j <= seg; j++) {
        const theta = (j / seg) * Math.PI * 2
        const cos = Math.cos(theta)
        const sin = Math.sin(theta)
        const lobeMod = lobes > 0 ? 1 + lobeDepth * Math.cos(lobes * theta) : 1
        const rr = r * lobeMod

        radial.copy(axN).multiplyScalar(cos).addScaledVector(axB, sin)
        pos.copy(points[i]!).addScaledVector(radial, rr)

        positions.push(pos.x, pos.y, pos.z)
        normals.push(radial.x, radial.y, radial.z)
        uvs.push((j / seg) * uScale, v)
        winds.push(wind)
        centers.push(points[i]!.x, points[i]!.y, points[i]!.z)
      }
    }

    for (let i = 0; i < rings - 1; i++) {
      for (let j = 0; j < seg; j++) {
        const a = vertBase + i * ringVerts + j
        const b = a + 1
        const c = a + ringVerts
        const d = c + 1
        indices.push(a, c, b, b, c, d)
      }
    }

    // Tip cap: seal the terminal ring when it ends at a real radius.
    let extraVerts = 0
    const tipR = radii[rings - 1]!
    if (tipR > 0.012) {
      const tp = points[rings - 1]!
      tangentAt(points, rings - 1, tan)
      const axN = fN[rings - 1]!
      const axB = fB[rings - 1]!
      const capUVr = tipR / tileWorldSize
      const capBase = vertBase + rings * ringVerts
      for (let j = 0; j <= seg; j++) {
        const theta = (j / seg) * Math.PI * 2
        const cos = Math.cos(theta)
        const sin = Math.sin(theta)
        const lobeMod = lobes > 0 ? 1 + lobeDepth * Math.cos(lobes * theta) : 1
        const rr = tipR * lobeMod
        radial.copy(axN).multiplyScalar(cos).addScaledVector(axB, sin)
        pos.copy(tp).addScaledVector(radial, rr)
        positions.push(pos.x, pos.y, pos.z)
        normals.push(tan.x, tan.y, tan.z)
        uvs.push(0.5 + capUVr * cos, 0.5 + capUVr * sin)
        winds.push(lastWind)
        centers.push(tp.x, tp.y, tp.z)
      }
      const centerIdx = capBase + (seg + 1)
      positions.push(tp.x, tp.y, tp.z)
      normals.push(tan.x, tan.y, tan.z)
      uvs.push(0.5, 0.5)
      winds.push(lastWind)
      centers.push(tp.x, tp.y, tp.z)
      for (let j = 0; j < seg; j++)
        indices.push(centerIdx, capBase + j + 1, capBase + j)
      extraVerts = seg + 1 + 1
    }

    vertBase += rings * ringVerts + extraVerts
  }

  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geo.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3))
  geo.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2))
  geo.setAttribute('aWind', new BufferAttribute(new Float32Array(winds), 1))
  geo.setAttribute('aStemCenter', new BufferAttribute(new Float32Array(centers), 3))
  geo.setIndex(indices)
  geo.computeBoundingSphere()
  return geo
}
