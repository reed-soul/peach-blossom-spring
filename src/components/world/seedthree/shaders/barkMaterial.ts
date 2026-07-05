// Bark material — MeshStandardNodeMaterial with wind sway via barkWindPosition.
//
// Ported from SeedThree (MIT, Copyright (c) 2026 SkyeShark) src/core/tree.js
// makeBarkMaterial. Standard PBR bark (map/normalMap/roughnessMap) + TSL
// positionNode that displaces vertices along the wind direction proportional to
// the baked aWind attribute (0 at trunk base → 1 at tips).

import { MeshStandardNodeMaterial } from 'three/webgpu'
import { barkWindPosition } from './wind'

export interface BarkAssets {
  barkTexture?: THREE.Texture | null
  barkNormal?: THREE.Texture | null
  barkRoughness?: THREE.Texture | null
}

export function makeBarkMaterial(assets: BarkAssets = {}): MeshStandardNodeMaterial {
  const mat = new MeshStandardNodeMaterial({
    map: assets.barkTexture ?? null,
    normalMap: assets.barkNormal ?? null,
    roughnessMap: assets.barkRoughness ?? null,
    color: assets.barkTexture ? 0xffffff : 0x6b5540,
    roughness: assets.barkRoughness ? 1.0 : 0.92,
    metalness: 0.0,
  })
  mat.positionNode = barkWindPosition()
  return mat
}
