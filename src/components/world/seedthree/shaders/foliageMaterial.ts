// Foliage material — TSL MeshSSSNodeMaterial with dome normals + SSS translucency.
//
// Ported verbatim from SeedThree (MIT, Copyright (c) 2026 SkyeShark) src/core/leaf-cards.js
// makeFoliageMaterial. The original is already TSL — adapted to TypeScript with
// the project's import paths.
//
// Visual features (all TSL):
//   - Dome-normal canopy shading: foliage normals computed from world position
//     relative to canopy bottom + up-bias, so crossed cards don't disagree.
//   - Normal-map relief: the leaf texture's normal DELTA added on top of the
//     dome vector — petal veins survive, card orientation contributes nothing.
//   - Luminance-preserving tint: recolors petals toward a tint while keeping
//     brightness via luminance(base)/luminance(tint).
//   - Barré-Brisebois SSS back-translucency: petals glow when backlit,
//     scaled by translucency map × per-instance aThickness × transmitted color.
//   - Instanced wind: positionNode from foliageWindPosition() (phase from
//     modelWorld·aAnchorPos, direction from pre-baked aWindVec).

import {
  MeshSSSNodeMaterial,
  Color,
  Vector3,
  DoubleSide,
} from 'three/webgpu'
import {
  texture,
  normalMap,
  uniform,
  mix,
  normalize,
  positionWorld,
  normalView,
  cameraViewMatrix,
  attribute,
  float,
  vec3,
  vec4,
  luminance,
} from 'three/tsl'
import { foliageWindPosition } from './wind'

export interface FoliageAssets {
  leafTexture: THREE.Texture | null
  leafNormal?: THREE.Texture | null
  leafRoughness?: THREE.Texture | null
  leafTranslucency?: THREE.Texture | null
}

export interface FoliageMaterialConfig {
  tint: number
  alphaTest: number
  leafColorize?: number
  leafTintAmount?: number
  /** canopy bottom in WORLD space (per-tree, updated on rebuild) */
  center?: Vector3
}

export interface BuiltFoliageMaterial {
  material: MeshSSSNodeMaterial
  /** call to move the dome origin (e.g. on tree rebuild) */
  centerUniform: ReturnType<typeof uniform<Vector3>>
  tintNode: ReturnType<typeof uniform<Color>>
  tintAmount: ReturnType<typeof uniform<number>>
}

export function makeFoliageMaterial(
  assets: FoliageAssets,
  cfg: FoliageMaterialConfig,
): BuiltFoliageMaterial {
  const tex = assets.leafTexture ?? null
  const texNormal = assets.leafNormal ?? null
  const texRoughness = assets.leafRoughness ?? null
  const texTranslucency = assets.leafTranslucency ?? null

  const mat = new MeshSSSNodeMaterial({
    map: tex,
    color: new Color(cfg.tint),
    roughness: 0.82,
    metalness: 0.0,
    side: DoubleSide,
    alphaTest: tex ? cfg.alphaTest : 0,
    transparent: false,
  })
  if (texNormal) mat.normalMap = texNormal
  if (texRoughness) {
    mat.roughnessMap = texRoughness
    mat.roughness = 1.0
  }

  // Tint as a luminance-preserving colorize.
  const tintNode = uniform(new Color(cfg.leafColorize ?? 0xffffff))
  const tintAmount = uniform(cfg.leafTintAmount ?? 0)
  if (tex) {
    const texel = texture(tex)
    const tl = new Color(cfg.tint).convertSRGBToLinear()
    const base = texel.rgb.mul(vec3(tl.r, tl.g, tl.b))
    const recolor = tintNode.mul(luminance(base).div(luminance(tintNode).max(0.08))).clamp(0, 1)
    mat.colorNode = mix(base, recolor, tintAmount)
    // Overriding colorNode detaches the map from the alpha path, restore cutout.
    mat.opacityNode = texel.a
  }

  // Dome-normal canopy shading.
  const centerUniform = uniform(cfg.center ?? new Vector3())
  const domeWorld = normalize(positionWorld.sub(centerUniform)).add(vec3(0, 0.45, 0))
  const domeView = cameraViewMatrix.mul(vec4(domeWorld, 0)).xyz.normalize()
  const relief = texNormal ? normalMap(texture(texNormal)).sub(normalView) : float(0)
  mat.normalNode = normalize(domeView.add(relief.mul(0.9)))

  // Instanced wind displacement.
  mat.positionNode = foliageWindPosition()

  // Barré-Brisebois SSS back-translucency.
  // Peach petals transmit warm pink (vs SeedThree's green for leaves).
  const transmit = uniform(new Color().setRGB(0.95, 0.7, 0.78))
  const perTexel = texTranslucency ? texture(texTranslucency).r : float(1)
  mat.thicknessColorNode = perTexel.mul(attribute('aThickness', 'float')).mul(transmit)
  mat.thicknessDistortionNode = uniform(0.3)
  mat.thicknessAmbientNode = uniform(0.16)
  mat.thicknessAttenuationNode = uniform(1.0)
  mat.thicknessPowerNode = uniform(6.0)
  mat.thicknessScaleNode = uniform(3.0)

  return { material: mat, centerUniform, tintNode, tintAmount }
}
