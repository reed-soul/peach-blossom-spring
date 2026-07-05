// SeedThreeForest — replaces the old L-system ProceduralTrees with a forest of
// Weber-Penn peach trees (LOD chain + dome-normal SSS petals + wind).
//
// Preserves the contract of the old component: zero props, mounted identically
// in PeachForestSceneContent and CinematicWorld. The forest layout (300 trees
// around z ≈ -55, avoiding the stream and cave) is preserved verbatim, with
// ONE fix: terrain height now comes from Terrain.tsx's getTerrainHeight
// (single source of truth) instead of a duplicated module-level noise2D that
// was seeded from Math.random (non-deterministic across reloads).
//
// Wind + sun uniforms are advanced once per frame in useFrame; sun direction
// is read from the first directional light found in the scene graph (falls
// back to a fixed default if none).

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three/webgpu'
import { getTerrainHeight, getStreamX } from '../Terrain'
import { buildForestAssets, type ForestSharedAssets } from './SingleTree'
import { buildLodTree, attachBillboard, DEFAULT_LOD_LEVELS } from './SeedTreeLod'
import { bakeImpostor } from './bake/impostor'
import { createWindUniforms } from './shaders/windUniforms'

const DEFAULT_SUN = new THREE.Vector3(0.5, 0.7, 0.5).normalize()
const _sunDir = new THREE.Vector3()
const _dirLightWorld = new THREE.Vector3()

export function SeedThreeForest() {
  const groupRef = useRef<THREE.Group>(null)
  const { scene, gl } = useThree()

  const wind = useMemo(() => createWindUniforms(), [])
  const assets = useMemo<ForestSharedAssets>(() => buildForestAssets(wind), [wind])
  // Track whether billboard baking has started (once per mount, after first paint).
  const billboardBaked = useRef(false)

  useEffect(() => {
    if (!groupRef.current) return
    // Clear any stale children (Strict Mode double-mount safe).
    while (groupRef.current.children.length > 0) {
      groupRef.current.remove(groupRef.current.children[0]!)
    }
    assets.foliageMaterials.length = 0

    // ── 300-tree layout, identical to old ProceduralTrees ──
    // (angle spiral + river/cave avoidance, z clustered near -55).
    const treeCount = 300
    const lods: THREE.LOD[] = []
    let placed = 0
    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2
      const baseR = 8 + Math.sin(i * 4.7) * 5
      const r = baseR + Math.sin(i * 7.3) * 8
      let x = Math.cos(angle + Math.sin(i * 0.3) * 2) * r
      let z = Math.sin(angle + Math.sin(i * 0.3) * 2) * r
      z = -55 + Math.abs(z) * 0.8

      // Avoid the stream (use the canonical getStreamX).
      const streamX = getStreamX(z)
      if (Math.abs(x - streamX) < 5) continue
      // Avoid the cave at (0, -50).
      const caveDist = Math.sqrt(x * x + (z + 50) * (z + 50))
      if (caveDist < 10) continue

      // Canonical terrain height (replaces the duplicated noise2D).
      const terrainY = getTerrainHeight(x, z)
      if (terrainY < -0.3) continue

      // Deterministic seed per tree.
      const seed = i * 12345 + 67890
      const lod = buildLodTree({ seed, assets, levels: DEFAULT_LOD_LEVELS })
      lod.position.set(x, terrainY, z)
      groupRef.current.add(lod)
      lods.push(lod)
      placed++
    }
    // eslint-disable-next-line no-console
    console.log(`[SeedThreeForest] placed ${placed} trees`)
  }, [assets])

  // Bake billboards asynchronously AFTER first paint so the forest renders
  // immediately at LOD0/LOD1; billboards replace nothing until attached.
  useFrame((state) => {
    const t = state.clock.elapsedTime
    wind.uTime.value = t

    // Find the first directional light and derive sun direction.
    let sunFound = false
    scene.traverse((obj) => {
      if (sunFound) return
      if ((obj as THREE.DirectionalLight).isDirectionalLight) {
        const dl = obj as THREE.DirectionalLight
        // Directional light "position" is the world-space target-offset; the
        // light shines from position toward (0,0,0) by default. Sun direction
        // (light travel dir) = position.normalize() negated for "toward scene"
        // convention. We use the position vector directly as "where the sun IS"
        // — our SSS shader treats uSunDirection as the vector TO the light.
        _dirLightWorld.copy(dl.position).normalize()
        sunFound = true
      }
    })
    _sunDir.copy(sunFound ? _dirLightWorld : DEFAULT_SUN)

    // Advance every per-tree foliage material (wind + sun).
    for (const fm of assets.foliageMaterials) fm.update(t, _sunDir)

    // Bake billboards once, after the first frame, on idle. We bake ONE
    // representative LOD0 (the forest's trees share geometry, so one bake
    // serves all — the billboard is the same per species).
    if (!billboardBaked.current && state.clock.elapsedTime > 0.5) {
      billboardBaked.current = true
      const forestGroup = groupRef.current
      if (forestGroup && forestGroup.children.length > 0) {
        // Defer to next idle callback to avoid frame hitch.
        const ric = typeof requestIdleCallback === 'function' ? requestIdleCallback : setTimeout
        ric(() => {
          const firstLod = forestGroup.children[0] as THREE.LOD | undefined
          if (!firstLod || !firstLod.isLOD) return
          try {
            const lod0 = firstLod.levels[0]?.object as THREE.Object3D | undefined
            if (!lod0) return
            const baked = bakeImpostor(gl, lod0, { size: 256, dilatePasses: 12 })
            // Attach billboard to every LOD at the configured far distance.
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
            // eslint-disable-next-line no-console
            console.warn('[SeedThreeForest] billboard bake skipped:', err)
          }
        })
      }
    }
  })

  return <group ref={groupRef} />
}
