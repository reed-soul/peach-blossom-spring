// SeedThreeForest — forest of Weber-Penn peach trees (LOD chain + dome-normal
// SSS petals + TSL wind).
//
// Preserves the contract of the old ProceduralTrees component: zero props,
// mounted identically in PeachForestSceneContent and CinematicWorld. The forest
// layout (300 trees around z ≈ -55, avoiding the stream and cave) is preserved
// verbatim, with ONE fix: terrain height now comes from Terrain.tsx's
// getTerrainHeight (single source of truth).
//
// TSL wind uniforms (windStrength/windSpeed from wind.ts) are module-level
// uniform() nodes auto-advanced by the renderer's time. No manual uTime plumbing
// needed. SSS NodeMaterial reads the scene's directional light directly, so no
// manual sun-direction traversal either.

import { useEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three/webgpu'
import { getTerrainHeight, getStreamX } from '../Terrain'
import { buildForestAssets, type ForestAssets } from './SingleTree'
import { buildLodTree, attachBillboard, DEFAULT_LOD_LEVELS } from './SeedTreeLod'
import { bakeImpostor } from './bake/impostor'

export function SeedThreeForest() {
  const groupRef = useRef<THREE.Group>(null)
  const { gl } = useThree()

  const assets = useMemo<ForestAssets>(() => buildForestAssets(), [])
  const billboardBaked = useRef(false)

  useEffect(() => {
    if (!groupRef.current) return
    while (groupRef.current.children.length > 0) {
      groupRef.current.remove(groupRef.current.children[0]!)
    }
    assets.foliageMaterials.length = 0

    // 300-tree layout (angle spiral + river/cave avoidance, z clustered near -55).
    const treeCount = 300
    let placed = 0
    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2
      const baseR = 8 + Math.sin(i * 4.7) * 5
      const r = baseR + Math.sin(i * 7.3) * 8
      let x = Math.cos(angle + Math.sin(i * 0.3) * 2) * r
      let z = Math.sin(angle + Math.sin(i * 0.3) * 2) * r
      z = -55 + Math.abs(z) * 0.8

      const streamX = getStreamX(z)
      if (Math.abs(x - streamX) < 5) continue
      const caveDist = Math.sqrt(x * x + (z + 50) * (z + 50))
      if (caveDist < 10) continue

      const terrainY = getTerrainHeight(x, z)
      if (terrainY < -0.3) continue

      const seed = i * 12345 + 67890
      const lod = buildLodTree({ seed, assets, levels: DEFAULT_LOD_LEVELS })
      lod.position.set(x, terrainY, z)
      groupRef.current.add(lod)
      placed++
    }
    void placed
  }, [assets])

  // Bake billboards asynchronously AFTER first paint.
  useFrame((state) => {
    if (billboardBaked.current || state.clock.elapsedTime < 0.5) return
    billboardBaked.current = true
    const forestGroup = groupRef.current
    if (!forestGroup || forestGroup.children.length === 0) return

    const ric = typeof requestIdleCallback === 'function' ? requestIdleCallback : setTimeout
    ric(async () => {
      const firstLod = forestGroup.children[0] as THREE.LOD | undefined
      if (!firstLod || !firstLod.isLOD) return
      try {
        const lod0 = firstLod.levels[0]?.object as THREE.Object3D | undefined
        if (!lod0) return
        const baked = await bakeImpostor(gl as unknown as THREE.WebGLRenderer, lod0, {
          size: 256,
          dilatePasses: 12,
        })
        for (const lod of forestGroup.children) {
          if ((lod as THREE.LOD).isLOD) {
            attachBillboard(lod as THREE.LOD, 100, {
              frontMap: baked.frontMap,
              sideMap: baked.sideMap,
              size: baked.size,
            })
          }
        }
      } catch (err) {
        // Non-fatal: forest just stays at LOD1 forever.
        console.warn('[SeedThreeForest] billboard bake skipped:', err)
      }
    })
  })

  return <group ref={groupRef} />
}
