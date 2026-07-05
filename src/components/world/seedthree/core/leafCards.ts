// Foliage as instanced petal cards — placed the way Blender Sapling / ez-tree /
// SeedThree do: one quad PER PETAL, anchored at its BASE EDGE on the actual
// branch centerline, oriented by the branch's local frame, tilted off the
// branch by a down-angle, spun around the branch by a phyllotactic angle, and
// gently drooped by gravity. Base-anchoring makes petals read as attached to
// the twig instead of floating clusters.
//
// Ported from SeedThree (MIT, Copyright (c) 2026 SkyeShark) leaf-cards.js,
// buildFoliage + makeLeafGeometry. Renderer-agnostic (plain InstancedMesh +
// InstancedBufferAttribute — works in WebGL).
//
// Outputs:
//   - BufferGeometry with a base-anchored quad (1 or 2 crossed planes)
//   - InstancedBufferAttribute aWindVec   (vec3) — R⁻¹S⁻¹·windDir × weight
//   - InstancedBufferAttribute aAnchorPos (vec3) — anchor in tree space
//   - InstancedBufferAttribute aThickness (float) — per-instance 0.4..1
// Plus the caller drives the InstancedMesh matrices (setMatrixAt) and
// per-instance colors (setColorAt) for the 4-color peach-blossom palette.

import {
  BufferGeometry,
  BufferAttribute,
  InstancedBufferAttribute,
  Vector3,
  Quaternion,
  Matrix4,
} from 'three/webgpu'
import type { Tip } from './weber-penn'
import type { FoliageConfig } from '../species/peach'
import { WIND_DIR } from '../shaders/windUniforms'

const X = new Vector3(1, 0, 0)
const Y = new Vector3(0, 1, 0)
const UP = new Vector3(0, 1, 0)
const DOWN = new Vector3(0, -1, 0)
const GOLDEN = (137.5 * Math.PI) / 180

export interface FoliageBuildResult {
  geometry: BufferGeometry
  count: number
  /** canopy bottom in WORLD space — feed to foliageShader.setCanopyBottom */
  canopyBottom: Vector3
  /** per-petal model matrices — InstancedMesh.setMatrixAt(i, matrices[i]) */
  matrices: Matrix4[]
}

// Base-anchored petal quad(s): base edge at y=0, tip at y=1, width along x,
// normal +Z. `quads=2` adds a second quad rotated 90° about the length axis
// for volume. Ported from makeLeafGeometry.
export function makeLeafGeometry(quads = 2): BufferGeometry {
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const base = [
    [-0.5, 0],
    [0.5, 0],
    [0.5, 1],
    [-0.5, 1],
  ]
  // v = y so the petal's base sits at the quad bottom (the twig).
  const uv = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ]
  let b = 0
  for (let q = 0; q < quads; q++) {
    const a = (q * Math.PI) / quads
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    for (let i = 0; i < 4; i++) {
      const [x, y] = base[i]!
      positions.push(x * ca, y, x * sa)
      normals.push(-sa, 0, ca)
      uvs.push(uv[i]![0], uv[i]![1])
    }
    indices.push(b, b + 1, b + 2, b, b + 2, b + 3)
    b += 4
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  g.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3))
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2))
  g.setIndex(indices)
  return g
}

interface RngLike {
  next(): number
  range(min: number, max: number): number
  vary(base: number, spread: number): number
}

interface BuildableTip extends Tip {
  winds?: number[]
}

/**
 * @param terminalStems  deepest-level stems (each has .points, .orients, .winds)
 * @param cfg            foliage config from the species preset
 * @param rng            threaded RNG (matches the skeleton's order)
 */
export function buildFoliage(
  terminalStems: BuildableTip[],
  cfg: FoliageConfig,
  rng: RngLike,
): FoliageBuildResult | null {
  if (!terminalStems.length || cfg.leavesPerBranch <= 0) return null

  // Canopy centroid + bottom (dome origin sits at the canopy BOTTOM so every
  // leaf gets an up-biased dome normal — no black undersides).
  const center = new Vector3()
  let minY = Infinity
  let maxY = -Infinity
  for (const s of terminalStems) {
    center.add(s.position)
    for (const p of [s.position]) {
      minY = Math.min(minY, p.y)
      maxY = Math.max(maxY, p.y)
    }
  }
  center.divideScalar(terminalStems.length)
  const canopyBottom = new Vector3(center.x, Math.min(minY - 0.5, center.y - 1), center.z)

  const geo = makeLeafGeometry(cfg.quads)
  const count = terminalStems.length * cfg.leavesPerBranch
  const windVec = new Float32Array(count * 3)
  const anchorPos = new Float32Array(count * 3)
  const thickness = new Float32Array(count)
  const matrices: Matrix4[] = new Array(count)

  // Reconstruct each tip's points/orients from position+orient alone. The
  // skeleton records only the tip frame; the placement grammar needs the
  // branch centerline near the tip, so we synthesize a short centerline from
  // the terminal orient (local +Y is the tangent at the tip).
  const qInv = new Quaternion()
  const wv = new Vector3()
  const tangent = new Vector3()
  const pts = [new Vector3(), new Vector3()]
  const oris = [new Quaternion(), new Quaternion()]

  let idx = 0
  for (const stem of terminalStems) {
    tangent.set(0, 1, 0).applyQuaternion(stem.orient).normalize()
    // Short centerline trailing back from the tip, length = stem.length/2.
    const back = stem.length * 0.5
    pts[0]!.copy(stem.position).addScaledVector(tangent, -back)
    pts[1]!.copy(stem.position)
    oris[0]!.copy(stem.orient)
    oris[1]!.copy(stem.orient)
    const segN = 1
    let phyllo = rng.range(0, Math.PI * 2)

    for (let i = 0; i < cfg.leavesPerBranch; i++) {
      const frac = cfg.startFrac + (1 - cfg.startFrac) * ((i + rng.next()) / cfg.leavesPerBranch)
      const fseg = Math.min(segN, Math.max(0, Math.floor(frac * segN)))
      const ft = frac * segN - fseg
      const pos = pts[fseg]!.clone().lerp(pts[fseg + 1]!, ft)
      const qFrame = oris[fseg]!.clone().slerp(oris[fseg + 1]!, ft)

      // qPetal = frame · phyllo(about tangent Y) · downAngle(about X)
      phyllo += GOLDEN + rng.vary(0, 0.3)
      const down = ((cfg.downAngle + rng.vary(0, cfg.downAngleV)) * Math.PI) / 180
      const q1 = new Quaternion().setFromAxisAngle(X, down)
      const q2 = new Quaternion().setFromAxisAngle(Y, phyllo)
      const q = qFrame.multiply(q2).multiply(q1)

      // Gravity droop (sag each petal toward the ground).
      if (cfg.droop > 0) {
        const n = new Vector3(0, 1, 0).applyQuaternion(q)
        const droopAxis = new Vector3().crossVectors(n, DOWN)
        if (droopAxis.lengthSq() > 1e-6) {
          droopAxis.normalize()
          const qb = new Quaternion().setFromAxisAngle(
            droopAxis,
            ((cfg.droop + rng.vary(0, cfg.droopV)) * Math.PI) / 180,
          )
          q.premultiply(qb)
        }
      }

      const s = cfg.size * (1 - cfg.taper * frac) * (1 + rng.vary(0, cfg.sizeVar))
      const scl = new Vector3(s * cfg.widthRatio, s, s)

      // Wind heading into this petal's local frame (inverse rotation, inverse
      // scale) so the instance transform maps it back to the true world wind.
      qInv.copy(q).invert()
      wv.copy(WIND_DIR).applyQuaternion(qInv)
      const twigWeight = 0.9 // tip twigs sway near-maximally
      windVec[idx * 3] = (wv.x / scl.x) * twigWeight
      windVec[idx * 3 + 1] = (wv.y / scl.y) * twigWeight
      windVec[idx * 3 + 2] = (wv.z / scl.z) * twigWeight
      anchorPos[idx * 3] = pos.x
      anchorPos[idx * 3 + 1] = pos.y
      anchorPos[idx * 3 + 2] = pos.z
      thickness[idx] = 0.4 + rng.next() * 0.6

      // Stash the matrix for the caller (it owns the InstancedMesh).
      matrices[idx] = new Matrix4().compose(pos, q, scl)
      idx++
    }
  }

  // Trim in case any branches produced fewer than leavesPerBranch (none do,
  // but defensive). Rebuild attrs at exact idx length.
  const realCount = idx
  geo.setAttribute('aWindVec', new InstancedBufferAttribute(windVec.slice(0, realCount * 3), 3))
  geo.setAttribute('aAnchorPos', new InstancedBufferAttribute(anchorPos.slice(0, realCount * 3), 3))
  geo.setAttribute('aThickness', new InstancedBufferAttribute(thickness.slice(0, realCount), 1))

  return {
    geometry: geo,
    count: realCount,
    canopyBottom,
    matrices: matrices.slice(0, realCount),
  }
}
