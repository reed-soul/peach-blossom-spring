import { useRef, useMemo, useEffect } from 'react'
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
  // 提升密度：2000 → 6000，配合聚簇分布让草地更茂密自然
  const count = 6000

  const grassTex = useMemo(() => createGrassAlphaTexture(), [])
  const grassMaterial = useMemo(
    () => createBillboardMaterial(grassTex, { wind: true, alphaTest: 0.12 }),
    [grassTex],
  )

  // Crossed-quad tuft geometry (SeedThree grass.js 范式): 两片交叉的 plane
  // 绕 Y 旋转 90°，法线强制朝上 (material 里 normalNode 设了)。
  // 比单 plane 体积感更好，配合 per-instance Y 旋转形成自然草丛。
  const tuftGeo = useMemo(() => makeTuftGeometry(), [])

  useEffect(() => {
    if (!meshRef.current) return
    const mat = new THREE.Matrix4()
    const rng = mulberry32(42)
    const colors: THREE.Color[] = []

    // 聚簇分布：先撒 ~120 个簇心，每簇周围 gaussian 抖动撒 ~50 株
    const clusterCount = 120
    const perCluster = Math.ceil(count / clusterCount)
    const clusters: { cx: number; cz: number; spread: number }[] = []
    for (let c = 0; c < clusterCount; c++) {
      clusters.push({
        cx: (rng() - 0.5) * 100,
        cz: (rng() - 0.5) * 100,
        spread: 2 + rng() * 4,
      })
    }

    let placed = 0
    for (let c = 0; c < clusterCount && placed < count; c++) {
      const cl = clusters[c]!
      for (let k = 0; k < perCluster && placed < count; k++) {
        const gx = (rng() + rng() + rng() - 1.5) * cl.spread
        const gz = (rng() + rng() + rng() - 1.5) * cl.spread
        const x = cl.cx + gx
        const z = cl.cz + gz

        const y = getTerrainHeight(x, z)
        if (y < -0.2) {
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
          new THREE.Vector3(widthScale, heightScale, widthScale),
        )
        meshRef.current.setMatrixAt(placed, mat)
        colors.push(GRASS_COLORS[Math.floor(rng() * GRASS_COLORS.length)]!)
        placed++
      }
    }

    meshRef.current.instanceColor = buildInstancedColors(colors)
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [])

  // TSL time 节点自动推进，不需要 useFrame 更新 uTime。

  return (
    <instancedMesh
      ref={meshRef}
      args={[tuftGeo, grassMaterial, count]}
      receiveShadow
    />
  )
}

// Crossed-quad tuft: 两个 plane 绕 Y 旋转 90° 交叉，base 在 y=0、tip 在 y=1。
// 法线强制朝上（ grass trick：像地面一样接受光照，不闪烁）。
function makeTuftGeometry(): THREE.BufferGeometry {
  const planes = 2
  const width = 1
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  let base = 0
  for (let q = 0; q < planes; q++) {
    const a = (q * Math.PI) / planes
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    for (const [lx, ly] of [
      [-0.5 * width, 0],
      [0.5 * width, 0],
      [0.5 * width, 1],
      [-0.5 * width, 1],
    ]) {
      positions.push(lx[0]! * ca, ly, lx[0]! * sa)
      normals.push(0, 1, 0)
      uvs.push(lx[0]! / width + 0.5, ly)
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
    base += 4
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3))
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2))
  g.setIndex(indices)
  return g
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
