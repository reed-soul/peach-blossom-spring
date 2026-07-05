import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three/webgpu'
import { createGrassAlphaTexture } from './proceduralTextures'
import { createBillboardMaterial } from './shaders/billboardInstanced'
import { getTerrainHeight } from './Terrain'

// Ground cover + rocks for the peach forest scene. The procedural trees
// themselves moved to ./seedthree/SeedThreeForest.tsx (Weber-Penn via SeedThree).
// This file retains the instanced grass and rocks, which still use the simple
// cylindrical-billboard shader and remain unchanged.
//
// Bug fix: terrain height is now sampled via the canonical getTerrainHeight
// (single source of truth in Terrain.tsx) instead of a duplicated module-level
// noise2D that was seeded from Math.random and diverged across reloads.

function mulberry32(a: number) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildInstancedColors(colors: THREE.Color[]): THREE.InstancedBufferAttribute {
  const attr = new THREE.InstancedBufferAttribute(new Float32Array(colors.length * 3), 3)
  colors.forEach((c, i) => attr.setXYZ(i, c.r, c.g, c.b))
  return attr
}

const GRASS_COLORS = [
  new THREE.Color(0x2d5a2d),
  new THREE.Color(0x3a6b3a),
  new THREE.Color(0x4a7c4a),
  new THREE.Color(0x5a8f5a),
  new THREE.Color(0x2a4f2a),
]

export function GroundCover() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const matRef = useRef<THREE.ShaderMaterial>(null)
  // 提升密度：2000 → 6000，配合聚簇分布让草地更茂密自然
  const count = 6000

  const grassTex = useMemo(() => createGrassAlphaTexture(), [])
  const grassMaterial = useMemo(
    () => createBillboardMaterial(grassTex, { wind: true, alphaTest: 0.12 }),
    [grassTex],
  )

  useEffect(() => {
    matRef.current = grassMaterial
  }, [grassMaterial])

  useEffect(() => {
    if (!meshRef.current) return
    const mat = new THREE.Matrix4()
    const rng = mulberry32(42)
    const colors: THREE.Color[] = []

    // 聚簇分布：先撒 ~120 个簇心，每簇周围 gaussian 抖动撒 ~50 株
    // 比均匀盐粒式更像真实草丛（草成团生长，非均匀铺满）
    const clusterCount = 120
    const perCluster = Math.ceil(count / clusterCount)
    const clusters: { cx: number; cz: number; spread: number }[] = []
    for (let c = 0; c < clusterCount; c++) {
      clusters.push({
        cx: (rng() - 0.5) * 100,
        cz: (rng() - 0.5) * 100,
        spread: 2 + rng() * 4, // 簇半径 2~6m
      })
    }

    let placed = 0
    for (let c = 0; c < clusterCount && placed < count; c++) {
      const cl = clusters[c]!
      for (let k = 0; k < perCluster && placed < count; k++) {
        // gaussian 抖动（3 次均匀求和近似正态）：草集中在簇心附近
        const gx = (rng() + rng() + rng() - 1.5) * cl.spread
        const gz = (rng() + rng() + rng() - 1.5) * cl.spread
        const x = cl.cx + gx
        const z = cl.cz + gz

        const y = getTerrainHeight(x, z)
        if (y < -0.2) {
          // 低洼区不生草：缩到极小而非 0（避免被裁但仍占 draw）
          mat.identity()
          mat.makeScale(1e-4, 1e-4, 1e-4)
          meshRef.current.setMatrixAt(placed, mat)
          colors.push(GRASS_COLORS[0]!)
          placed++
          continue
        }

        const heightScale = rng() * 0.5 + 0.5
        const widthScale = rng() * 0.25 + 0.15
        const rotY = rng() * Math.PI * 2
        const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, 0))
        mat.compose(
          new THREE.Vector3(x, y, z),
          quat,
          new THREE.Vector3(widthScale, heightScale, 1),
        )
        meshRef.current.setMatrixAt(placed, mat)
        colors.push(GRASS_COLORS[Math.floor(rng() * GRASS_COLORS.length)]!)
        placed++
      }
    }

    meshRef.current.instanceColor = buildInstancedColors(colors)
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [])

  useFrame((state) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = state.clock.elapsedTime
    }
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      material={grassMaterial}
      receiveShadow
    >
      <planeGeometry args={[1, 1]} />
    </instancedMesh>
  )
}

export function Rocks() {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  useEffect(() => {
    if (!meshRef.current) return
    const count = 80
    const mat = new THREE.Matrix4()
    const rng = mulberry32(99)

    for (let i = 0; i < count; i++) {
      const x = (rng() - 0.5) * 100
      const z = (rng() - 0.5) * 100

      const y = getTerrainHeight(x, z)
      if (y < -0.5) continue

      const scale = rng() * 0.8 + 0.2
      const quat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(rng() * 0.3, rng() * Math.PI * 2, rng() * 0.3),
      )
      mat.compose(
        new THREE.Vector3(x, y + scale * 0.3, z),
        quat,
        new THREE.Vector3(scale, scale * 0.7, scale),
      )
      meshRef.current.setMatrixAt(i, mat)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [])

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, 80]} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={0x6d6d6d} roughness={1} />
    </instancedMesh>
  )
}
