// Single peach tree — assembles a Weber-Penn skeleton + branch mesh + instanced
// petal cards, wired to the bark + foliage shaders. Returns a THREE.Group ready
// to drop into a scene. This is the unit the forest (Phase 5) instanciates.
//
// The geometry is generated ONCE per (species, seed) and cached; materials are
// shared across all trees of the same species (one bark material, one foliage
// material per forest). Wind uniforms are also shared — advanced once per frame.

import * as THREE from 'three/webgpu'
import { Rng } from './core/rng'
import { generateSkeleton } from './core/weber-penn'
import { buildBranchGeometry } from './core/branch-mesh'
import { buildFoliage } from './core/leafCards'
import { peach, type SpeciesPreset } from './species/peach'
import { createBarkMaterial } from './shaders/barkShader'
import { createFoliageMaterial, type FoliageMaterial } from './shaders/foliageShader'
import type { WindUniforms } from './shaders/windUniforms'
import { PbrTextures } from '../../../cinematic/textures/PbrTextures'
import { createPetalAlphaTexture } from '../proceduralTextures'

// 4-color peach-blossom palette (mirrors ProceduralTrees.tsx pickBlossomColor).
const BLOSSOM_PALETTE = [0xffb7c5, 0xff9eb5, 0xffc0cb, 0xffffff]
const _color = new THREE.Color()

// Geometry cache: keyed by `${species.name}:${seed}`. LOD levels can be added
// later without busting this cache (LOD0 stays the same).
interface CachedTree {
  branchGeo: THREE.BufferGeometry
  foliage: ReturnType<typeof buildFoliage>
}
const geoCache = new Map<string, CachedTree>()

function getCachedGeometry(species: SpeciesPreset, seed: string | number): CachedTree {
  const key = `${species.name}:${seed}`
  let cached = geoCache.get(key)
  if (!cached) {
    const rng = new Rng(seed)
    const { stems, tips } = generateSkeleton(species.params, rng)
    const branchGeo = buildBranchGeometry(stems, { tileWorldSize: species.tileWorldSize })
    const foliage = buildFoliage(tips, species.foliage, new Rng(`${seed}-petals`))
    cached = { branchGeo, foliage }
    geoCache.set(key, cached)
  }
  return cached
}

export interface ForestSharedAssets {
  /** bark material — shared across all trees of this species (one wind shader) */
  barkMaterial: THREE.MeshStandardMaterial
  /** foliage base material template — cloned per tree (each needs its own
   *  canopyBottom uniform). Geometry is still shared via the cache. */
  foliageTemplate: THREE.MeshStandardMaterial
  translucencyMap: THREE.Texture
  wind: WindUniforms
  /** per-tree foliage material handles (one per tree built) — updated each frame */
  foliageMaterials: FoliageMaterial[]
}

/**
 * Build the shared assets for a forest of one species. Call ONCE per forest.
 * The foliage material is a TEMPLATE — buildSingleTree clones it per tree so
 * each gets its own canopyBottom uniform (the dome origin differs per tree).
 *
 * Texture maps come from public/textures/peach/ when Phase 2 has produced them;
 * otherwise we fall back gracefully:
 *   - petals: programmatic createPetalAlphaTexture (no per-petal relief)
 *   - translucency: flat "all-transmit" canvas (uniform SSS glow, no vein mask)
 */
export function buildForestAssets(wind: WindUniforms): ForestSharedAssets {
  // ── bark ──
  const barkBase = new THREE.MeshStandardMaterial({
    color: 0x8a6a52,
    roughness: 0.95,
    map: PbrTextures.wood([1, 3]),
    roughnessMap: PbrTextures.woodRough([1, 3]),
  })
  const barkMaterial = createBarkMaterial(barkBase, { wind })

  // ── foliage template ──
  const petalTex = createPetalAlphaTexture()
  const foliageTemplate = new THREE.MeshStandardMaterial({
    map: petalTex,
    color: 0xffc8d8,
    roughness: 0.85,
    metalness: 0,
    side: THREE.DoubleSide,
    alphaTest: 0.4,
    transparent: false,
  })

  // Translucency fallback: a flat 1×1 "all-transmit" canvas so SSS still glows
  // (uniformly) when the derived translucency map is absent.
  const translucencyMap = makeFallbackTranslucency()

  return { barkMaterial, foliageTemplate, translucencyMap, wind, foliageMaterials: [] }
}

function makeFallbackTranslucency(): THREE.Texture {
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas')
    c.width = c.height = 1
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 1, 1)
    const t = new THREE.CanvasTexture(c)
    t.needsUpdate = true
    return t
  }
  // Node/test env: a DataTexture stand-in (won't actually render, just non-null).
  const data = new Uint8Array([255, 255, 255, 255])
  return new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat)
}

export interface BuildSingleTreeOptions {
  species?: SpeciesPreset
  seed: string | number
  assets: ForestSharedAssets
}

/**
 * Build one tree (skeleton + branch mesh + petal InstancedMesh). The Group's
 * local origin is the trunk base; position the Group at the terrain height.
 *
 * Each tree gets its own foliage MATERIAL instance (cloned from the template)
 * so the per-tree canopyBottom uniform is independent. Geometry stays cached
 * and shared. The new FoliageMaterial is pushed onto assets.foliageMaterials
 * so the forest's useFrame can advance all of them.
 */
export function buildSingleTree(opts: BuildSingleTreeOptions): THREE.Group {
  const species = opts.species ?? peach
  const { branchGeo, foliage } = getCachedGeometry(species, opts.seed)
  const group = new THREE.Group()

  // Branch mesh (shared bark material — wind uniforms are global, no per-tree
  // state needed).
  const branchMesh = new THREE.Mesh(branchGeo, opts.assets.barkMaterial)
  branchMesh.castShadow = true
  branchMesh.receiveShadow = true
  group.add(branchMesh)

  // Foliage: clone the template material per tree, wire canopyBottom.
  if (foliage) {
    const foliageMat = createFoliageMaterial(opts.assets.foliageTemplate, {
      wind: opts.assets.wind,
      transmitColor: new THREE.Color(0.95, 0.7, 0.78), // warm pink for peach
      translucencyMap: opts.assets.translucencyMap,
    })
    foliageMat.setCanopyBottom(foliage.canopyBottom)
    opts.assets.foliageMaterials.push(foliageMat)

    const mesh = new THREE.InstancedMesh(foliage.geometry, foliageMat.material, foliage.count)
    mesh.castShadow = false // petals too thin to cast meaningful shadows
    mesh.receiveShadow = false
    for (let i = 0; i < foliage.count; i++) {
      mesh.setMatrixAt(i, foliage.matrices[i]!)
      // 4-color palette pick (deterministic per petal via index hash).
      _color.setHex(BLOSSOM_PALETTE[(i * 7919) % BLOSSOM_PALETTE.length]!)
      mesh.setColorAt(i, _color)
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    group.add(mesh)
  }

  return group
}
