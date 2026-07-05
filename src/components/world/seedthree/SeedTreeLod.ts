// LOD chain assembly for peach trees.
//
// Adapted from SeedThree's tree.js (MIT, Copyright (c) 2026 SkyeShark) but
// SIMPLIFIED to this project's needs:
//   - LOD0: full Weber-Penn geometry (real branches + instanced petals)
//   - LOD1: same skeleton, coarser cylinders (radialScale + ringStride) +
//           half the petals — keeps silhouette, ~50% triangles
//   - LOD2: 2-plane billboard impostor (baked from front + side ortho views)
//
// What we DROP vs SeedThree: the LOD1.5 "baked branch cards" hybrid level
// (SpeedTree-style cluster sprays over a thinned twig skeleton), the mobile
// 5-level ladder, and in-place buffer reuse (we cache geometry instead).
// These are valuable but not load-bearing for a 300-tree ornamental forest.

import * as THREE from 'three/webgpu'
import { Rng } from './core/rng'
import { generateSkeleton } from './core/weber-penn'
import { buildBranchGeometry } from './core/branch-mesh'
import { buildFoliage } from './core/leafCards'
import type { SpeciesPreset } from './species/peach'
import { peach } from './species/peach'
import type { ForestAssets } from './SingleTree'
import { makeFoliageMaterial } from './shaders/foliageMaterial'

const _color = new THREE.Color()
const BLOSSOM_PALETTE = [0xffb7c5, 0xff9eb5, 0xffc0cb, 0xffffff]

export interface LodLevelSpec {
  /** distance from camera at which this level becomes active */
  distance: number
  /** cylinder radial scale (1 = full, 0.6 = coarser) */
  radialScale: number
  /** keep every Nth cross-section (1 = full, 2 = half) */
  ringStride: number
  /** petal count multiplier (1 = full, 0.5 = half) */
  petalDensity: number
}

// Sensible defaults for a 300-tree forest on a 70-FOV camera (far=500).
// LOD0 < 30m: hero. LOD1 30–80m: coarse cylinders + half petals.
// LOD2 ≥ 80m: billboard (attached later via bakeImpostor).
export const DEFAULT_LOD_LEVELS: LodLevelSpec[] = [
  { distance: 0, radialScale: 1, ringStride: 1, petalDensity: 1 },
  { distance: 30, radialScale: 0.6, ringStride: 2, petalDensity: 0.5 },
]

interface CachedLodGeometry {
  levels: Array<{
    branchGeo: THREE.BufferGeometry
    foliage: ReturnType<typeof buildFoliage>
  }>
}

const lodGeoCache = new Map<string, CachedLodGeometry>()

function getCachedLodGeometry(
  species: SpeciesPreset,
  seed: string | number,
  specs: LodLevelSpec[],
): CachedLodGeometry {
  // Cache key includes the spec fingerprint so changing LOD distances rebuilds.
  const specKey = specs.map((s) => `${s.distance}:${s.radialScale}:${s.ringStride}:${s.petalDensity}`).join('|')
  const key = `${species.name}:${seed}:${specKey}`
  let cached = lodGeoCache.get(key)
  if (!cached) {
    const skRng = new Rng(`${species.name}:${seed}`)
    const { stems, tips } = generateSkeleton(species.params, skRng)
    cached = {
      levels: specs.map((spec, idx) => {
        const branchGeo = buildBranchGeometry(stems, {
          tileWorldSize: species.tileWorldSize,
          radialScale: spec.radialScale,
          ringStride: spec.ringStride,
        })
        // For LOD1+, thin the petal count via a custom foliage config.
        const foliageCfg = {
          ...species.foliage,
          leavesPerBranch: Math.max(
            1,
            Math.round(species.foliage.leavesPerBranch * spec.petalDensity),
          ),
        }
        // Each LOD level uses a fresh petal RNG derived from the level index
        // so placements stay deterministic per (seed, level).
        const foliage = buildFoliage(tips, foliageCfg, new Rng(`${seed}-petals-lod${idx}`))
        return { branchGeo, foliage }
      }),
    }
    lodGeoCache.set(key, cached)
  }
  return cached
}

export interface BuildLodTreeOptions {
  species?: SpeciesPreset
  seed: string | number
  assets: ForestAssets
  /** LOD level specs (excluding the billboard, which is attached later) */
  levels?: LodLevelSpec[]
  /** hysteresis fraction (0.05 = 5%) — softens LOD transitions */
  hysteresis?: number
}

/**
 * Build one tree as a THREE.LOD with multiple mesh levels. The billboard level
 * (LOD3, max distance) is attached separately by `attachBillboard` once it has
 * been baked; the returned LOD has LOD0 + LOD1 ready to render immediately.
 *
 * Position the LOD at the terrain height; its local origin is the trunk base.
 */
export function buildLodTree(opts: BuildLodTreeOptions): THREE.LOD {
  const species = opts.species ?? peach
  const specs = opts.levels ?? DEFAULT_LOD_LEVELS
  const hysteresis = opts.hysteresis ?? 0.05

  const cached = getCachedLodGeometry(species, opts.seed, specs)
  const lod = new THREE.LOD()
  lod.autoUpdate = true

  cached.levels.forEach((lv, idx) => {
    const spec = specs[idx]!
    const level = new THREE.Group()
    level.name = `peach_LOD${idx}`

    // Branch mesh.
    const branchMesh = new THREE.Mesh(lv.branchGeo, opts.assets.barkMaterial)
    branchMesh.castShadow = idx === 0 // only LOD0 casts shadows (perf)
    branchMesh.receiveShadow = true
    level.add(branchMesh)

    // Foliage — per-tree material (own canopyBottom/dome uniform).
    if (lv.foliage) {
      const foliageMat = makeFoliageMaterial(opts.assets.foliageAssets, {
        tint: species.foliage.tint,
        alphaTest: species.foliage.alphaTest,
        center: lv.foliage.canopyBottom,
      })
      opts.assets.foliageMaterials.push(foliageMat)

      const mesh = new THREE.InstancedMesh(lv.foliage.geometry, foliageMat.material, lv.foliage.count)
      mesh.castShadow = false
      mesh.receiveShadow = false
      for (let i = 0; i < lv.foliage.count; i++) {
        mesh.setMatrixAt(i, lv.foliage.matrices[i]!)
        _color.setHex(BLOSSOM_PALETTE[(i * 7919) % BLOSSOM_PALETTE.length]!)
        mesh.setColorAt(i, _color)
      }
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      level.add(mesh)
    }

    lod.addLevel(level, spec.distance, hysteresis)
  })

  return lod
}

/**
 * Attach a baked billboard as the farthest LOD level. Call after bakeImpostor
 * has produced the texture set. The billboard is a 2-plane crossed card with
 * the foliage material (dome normal + SSS still apply, just on a flat quad).
 */
export function attachBillboard(
  lod: THREE.LOD,
  distance: number,
  textures: { frontMap: THREE.Texture; sideMap: THREE.Texture; size: number },
  hysteresis = 0.05,
): void {
  const group = new THREE.Group()
  group.name = 'peach_billboard'

  const makePlane = (map: THREE.Texture, rotY: number) => {
    const geo = new THREE.PlaneGeometry(textures.size, textures.size)
    geo.translate(0, textures.size / 2, 0) // base at y=0
    geo.rotateY(rotY)
    const mat = new THREE.MeshBasicMaterial({
      map,
      transparent: true,
      alphaTest: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const m = new THREE.Mesh(geo, mat)
    m.castShadow = false
    m.receiveShadow = false
    return m
  }

  group.add(makePlane(textures.frontMap, 0))
  group.add(makePlane(textures.sideMap, Math.PI / 2))
  lod.addLevel(group, distance, hysteresis)
}
