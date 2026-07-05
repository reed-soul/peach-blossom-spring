// Single peach tree — assembles a Weber-Penn skeleton + branch mesh + instanced
// petal cards, wired to TSL bark + foliage NodeMaterials. Returns a THREE.Group
// ready to drop into a scene. This is the unit the forest instanciates.
//
// Geometry is generated ONCE per (species, seed) and cached; the bark material
// is shared across all trees of the same species (one wind shader), the foliage
// material is cloned per-tree (each needs its own canopyBottom/dome uniform).

import * as THREE from 'three/webgpu'
import { Rng } from './core/rng'
import { generateSkeleton } from './core/weber-penn'
import { buildBranchGeometry } from './core/branch-mesh'
import { buildFoliage } from './core/leafCards'
import { peach, type SpeciesPreset } from './species/peach'
import { makeBarkMaterial, type BarkAssets } from './shaders/barkMaterial'
import { makeFoliageMaterial, type FoliageAssets, type BuiltFoliageMaterial } from './shaders/foliageMaterial'
import { PbrTextures } from '../../../cinematic/textures/PbrTextures'
import { createPetalAlphaTexture } from '../proceduralTextures'

// 4-color peach-blossom palette (mirrors the old ProceduralTrees.tsx pickBlossomColor).
const BLOSSOM_PALETTE = [0xffb7c5, 0xff9eb5, 0xffc0cb, 0xffffff]
const _color = new THREE.Color()

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

export interface ForestAssets {
  /** bark material — shared across all trees of this species (one wind shader) */
  barkMaterial: ReturnType<typeof makeBarkMaterial>
  /** foliage assets template — textures shared; material built per-tree */
  foliageAssets: FoliageAssets
  /** per-tree foliage material handles (one per tree built) */
  foliageMaterials: BuiltFoliageMaterial[]
}

/**
 * Build the shared assets for a forest of one species. Call ONCE per forest.
 */
export function buildForestAssets(): ForestAssets {
  const barkAssets: BarkAssets = {
    barkTexture: PbrTextures.wood([1, 3]),
    barkRoughness: PbrTextures.woodRough([1, 3]),
  }
  const barkMaterial = makeBarkMaterial(barkAssets)

  // Foliage assets: petal texture + (once Phase 2 generates them) PBR maps.
  // Until then, fall back to the programmatic petal alpha + a flat translucency.
  const petalTex = createPetalAlphaTexture()
  const foliageAssets: FoliageAssets = {
    leafTexture: petalTex,
    leafTranslucency: makeFallbackTranslucency(),
  }

  return { barkMaterial, foliageAssets, foliageMaterials: [] }
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
  const data = new Uint8Array([255, 255, 255, 255])
  return new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat)
}

export interface BuildSingleTreeOptions {
  species?: SpeciesPreset
  seed: string | number
  assets: ForestAssets
}

/**
 * Build one tree (skeleton + branch mesh + petal InstancedMesh). The Group's
 * local origin is the trunk base; position the Group at the terrain height.
 */
export function buildSingleTree(opts: BuildSingleTreeOptions): THREE.Group {
  const species = opts.species ?? peach
  const { branchGeo, foliage } = getCachedGeometry(species, opts.seed)
  const group = new THREE.Group()

  const branchMesh = new THREE.Mesh(branchGeo, opts.assets.barkMaterial)
  branchMesh.castShadow = true
  branchMesh.receiveShadow = true
  group.add(branchMesh)

  if (foliage) {
    const built = makeFoliageMaterial(opts.assets.foliageAssets, {
      tint: species.foliage.tint,
      alphaTest: species.foliage.alphaTest,
      center: foliage.canopyBottom,
    })
    opts.assets.foliageMaterials.push(built)

    const mesh = new THREE.InstancedMesh(foliage.geometry, built.material, foliage.count)
    mesh.castShadow = false
    mesh.receiveShadow = false
    for (let i = 0; i < foliage.count; i++) {
      mesh.setMatrixAt(i, foliage.matrices[i]!)
      _color.setHex(BLOSSOM_PALETTE[(i * 7919) % BLOSSOM_PALETTE.length]!)
      mesh.setColorAt(i, _color)
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    group.add(mesh)
  }

  return group
}
