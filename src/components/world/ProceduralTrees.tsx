import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { createNoise2D } from 'simplex-noise'

const noise2D = createNoise2D()

// Generate a single peach tree's branch geometry
function generateTree(
  origin: THREE.Vector3,
  seed: number,
  height: number,
  spread: number,
): { trunkMeshes: THREE.InstancedMesh; blossomMeshes: THREE.InstancedMesh } {
  const trunkPositions: THREE.Matrix4[] = []
  const blossomPositions: THREE.Matrix4[] = []
  const blossomColors: THREE.Color[] = []
  const rng = mulberry32(seed)

  // Recursive branch generation
  function branch(
    start: THREE.Vector3,
    direction: THREE.Vector3,
    length: number,
    thickness: number,
    depth: number,
  ) {
    if (depth > 5 || length < 0.15) return

    const end = start.clone().add(direction.clone().multiplyScalar(length))
    const mid = start.clone().lerp(end, 0.5)

    // Add trunk segment
    const mat = new THREE.Matrix4()
    const up = new THREE.Vector3(0, 1, 0)
    const quat = new THREE.Quaternion().setFromUnitVectors(up, direction.clone().normalize())
    mat.compose(
      mid,
      quat,
      new THREE.Vector3(thickness, length / 2, thickness),
    )
    trunkPositions.push(mat)

    // Add blossoms at branch tips (depth 3+)
    if (depth >= 3) {
      const blossomCount = Math.floor(rng() * 4) + 2
      for (let b = 0; b < blossomCount; b++) {
        const bPos = end.clone().add(
          new THREE.Vector3(
            (rng() - 0.5) * spread * 0.6,
            rng() * 0.5 + 0.2,
            (rng() - 0.5) * spread * 0.6,
          ),
        )
        const bSize = rng() * 0.4 + 0.3

        const bMat = new THREE.Matrix4()
        bMat.compose(bPos, new THREE.Quaternion(), new THREE.Vector3(bSize, bSize * 0.6, bSize))
        blossomPositions.push(bMat)

        // Vary pink tones
        const color = new THREE.Color()
        const pinkVariant = rng()
        if (pinkVariant < 0.3) {
          color.setHex(0xffb7c5) // Light pink
        } else if (pinkVariant < 0.6) {
          color.setHex(0xff9eb5) // Medium pink
        } else if (pinkVariant < 0.85) {
          color.setHex(0xffc0cb) // Soft pink
        } else {
          color.setHex(0xffffff) // White blossom
        }
        blossomColors.push(color)
      }
    }

    // Sub-branches
    if (depth < 5) {
      const numBranches = depth === 0 ? 3 : Math.floor(rng() * 3) + 1
      for (let i = 0; i < numBranches; i++) {
        const spreadAngle = (rng() - 0.5) * Math.PI * 0.6
        const upAngle = (rng() * 0.4 + 0.2) * Math.PI

        const newDir = direction.clone()
        // Rotate around a perpendicular axis
        const perpAxis = new THREE.Vector3()
        if (Math.abs(direction.x) < 0.9) {
          perpAxis.crossVectors(direction, new THREE.Vector3(1, 0, 0)).normalize()
        } else {
          perpAxis.crossVectors(direction, new THREE.Vector3(0, 0, 1)).normalize()
        }
        newDir.applyAxisAngle(perpAxis, spreadAngle)
        newDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), (rng() - 0.5) * 0.5)
        // Bias upward
        newDir.y = Math.abs(newDir.y) * 0.6 + 0.4
        newDir.normalize()

        const newLength = length * (0.6 + rng() * 0.2)
        const newThickness = thickness * (0.5 + rng() * 0.15)

        // Small offset to start point for natural look
        const offset = direction.clone().multiplyScalar(length * 0.3)
        branch(start.clone().add(offset), newDir, newLength, newThickness, depth + 1)
      }
    }
  }

  // Start trunk
  const trunkDir = new THREE.Vector3(0, 1, 0)
  branch(origin, trunkDir, height, 0.15, 0)

  // Create instanced meshes
  const trunkGeo = new THREE.CylinderGeometry(1, 1, 1, 10)
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x5d4037,
    roughness: 1,
  })
  const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, trunkPositions.length)
  trunkPositions.forEach((m, i) => trunkMesh.setMatrixAt(i, m))
  trunkMesh.instanceMatrix.needsUpdate = true
  trunkMesh.castShadow = true
  trunkMesh.receiveShadow = true

  const blossomGeo = new THREE.SphereGeometry(1, 10, 8)
  const blossomMat = new THREE.MeshStandardMaterial({
    roughness: 0.8,
    vertexColors: false,
  })
  const blossomMesh = new THREE.InstancedMesh(blossomGeo, blossomMat, blossomPositions.length)
  blossomPositions.forEach((m, i) => blossomMesh.setMatrixAt(i, m))
  // Set instance colors
  const colorAttr = new THREE.InstancedBufferAttribute(
    new Float32Array(blossomColors.length * 3), 3,
  )
  blossomColors.forEach((c, i) => {
    colorAttr.setXYZ(i, c.r, c.g, c.b)
  })
  blossomMesh.instanceColor = colorAttr
  blossomMesh.instanceMatrix.needsUpdate = true
  blossomMesh.castShadow = true

  return { trunkMeshes: trunkMesh, blossomMeshes: blossomMesh }
}

// Simple seeded random
function mulberry32(a: number) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function ProceduralTrees() {
  const groupRef = useRef<THREE.Group>(null)
  const trunkRef = useRef<THREE.InstancedMesh>(null)
  const blossomRef = useRef<THREE.InstancedMesh>(null)

  useEffect(() => {
    if (!groupRef.current) return

    // Clear previous
    while (groupRef.current.children.length > 0) {
      const child = groupRef.current.children[0]
      groupRef.current.remove(child)
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        ;(child.material as THREE.Material).dispose()
      }
    }

    const treeCount = 300
    const allTrunks: THREE.InstancedMesh[] = []
    const allBlossoms: THREE.InstancedMesh[] = []

    // Generate tree positions - cluster along stream banks, avoid stream itself
    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2
      const baseR = 8 + Math.sin(i * 4.7) * 5
      const r = baseR + Math.sin(i * 7.3) * 8
      let x = Math.cos(angle + Math.sin(i * 0.3) * 2) * r
      let z = Math.sin(angle + Math.sin(i * 0.3) * 2) * r

      // Keep trees mostly in forest area (spread along z)
      z = -55 + Math.abs(z) * 0.8

      // Skip if too close to center stream
      const streamX = Math.sin(((z + 60) / 120) * Math.PI * 3) * 6 + Math.sin(((z + 60) / 120) * Math.PI * 7) * 2
      if (Math.abs(x - streamX) < 5) continue

      // Skip if too close to cave entrance
      const caveDist = Math.sqrt(x * x + (z + 50) * (z + 50))
      if (caveDist < 10) continue

      const seed = i * 12345 + 67890
      const height = 2.5 + Math.sin(i * 3.1) * 1.2
      const spread = 1.2 + Math.sin(i * 2.7) * 0.5

      // Get terrain height at this position
      let terrainY = 0
      terrainY += noise2D(x * 0.02, z * 0.02) * 6
      terrainY += noise2D(x * 0.05, z * 0.05) * 2
      terrainY += noise2D(x * 0.1, z * 0.1) * 0.5
      if (terrainY < -0.3) continue // Don't place in stream

      const { trunkMeshes, blossomMeshes } = generateTree(
        new THREE.Vector3(x, terrainY, z),
        seed,
        height,
        spread,
      )

      allTrunks.push(trunkMeshes)
      allBlossoms.push(blossomMeshes)
    }

    // Merge all instances into two big instanced meshes for performance
    let totalTrunks = 0
    let totalBlossoms = 0
    allTrunks.forEach(m => totalTrunks += m.count)
    allBlossoms.forEach(m => totalBlossoms += m.count)

    // Add individual meshes to group (InstancedMesh merging is complex)
    allTrunks.forEach(m => groupRef.current!.add(m))
    allBlossoms.forEach(m => groupRef.current!.add(m))
  }, [])

  return <group ref={groupRef} />
}

// Ground cover - small grass tufts and flowers
export function GroundCover() {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  useEffect(() => {
    if (!meshRef.current) return
    const count = 2000
    const mat = new THREE.Matrix4()
    const rng = mulberry32(42)

    for (let i = 0; i < count; i++) {
      const x = (rng() - 0.5) * 100
      const z = (rng() - 0.5) * 100

      let y = 0
      y += noise2D(x * 0.02, z * 0.02) * 6
      y += noise2D(x * 0.05, z * 0.05) * 2
      y += noise2D(x * 0.1, z * 0.1) * 0.5
      if (y < -0.2) continue

      const scale = rng() * 0.3 + 0.1
      const rotY = rng() * Math.PI * 2
      const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, (rng() - 0.5) * 0.3))
      mat.compose(new THREE.Vector3(x, y, z), quat, new THREE.Vector3(scale, scale * 2, scale))
      meshRef.current.setMatrixAt(i, mat)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [])

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, 2000]} receiveShadow>
      <coneGeometry args={[0.3, 0.6, 4]} />
      <meshStandardMaterial color={0x3a6b3a} roughness={1} />
    </instancedMesh>
  )
}

// Scattered rocks and boulders
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

      let y = 0
      y += noise2D(x * 0.02, z * 0.02) * 6
      y += noise2D(x * 0.05, z * 0.05) * 2
      if (y < -0.5) continue

      const scale = rng() * 0.8 + 0.2
      const quat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(rng() * 0.3, rng() * Math.PI * 2, rng() * 0.3),
      )
      mat.compose(new THREE.Vector3(x, y + scale * 0.3, z), quat, new THREE.Vector3(scale, scale * 0.7, scale))
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
