import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createNoise2D } from 'simplex-noise'
import { PbrTextures } from '../../cinematic/textures/PbrTextures'
import { createPetalAlphaTexture, createGrassAlphaTexture } from './proceduralTextures'
import { createBillboardMaterial } from './shaders/billboardInstanced'

const noise2D = createNoise2D()

// 构建一段锥形圆柱几何（从 start 到 end，起点半径 r1，终点半径 r2）
// 圆柱默认沿 Y 轴，这里旋转+平移到 start→end 方向
const _up = new THREE.Vector3(0, 1, 0)
function buildSegmentCylinder(start: THREE.Vector3, end: THREE.Vector3, r1: number, r2: number, radialSeg = 10): THREE.BufferGeometry {
  const len = start.distanceTo(end)
  const geo = new THREE.CylinderGeometry(r2, r1, len, radialSeg, 1, false)
  // 旋转：默认 Y 轴 → start→end 方向
  const dir = end.clone().sub(start).normalize()
  const quat = new THREE.Quaternion().setFromUnitVectors(_up, dir)
  const mid = start.clone().lerp(end, 0.5)
  geo.applyQuaternion(quat)
  geo.translate(mid.x, mid.y, mid.z)
  return geo
}

// 合并多段几何为一个 BufferGeometry（消除段间拼接缝）
function mergeSegmentGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  // 简易合并：手动拼接 position/normal/uv（不依赖 BufferGeometryUtils）
  let posCount = 0
  let normCount = 0
  let uvCount = 0
  let idxCount = 0
  for (const g of geos) {
    posCount += g.attributes.position.count
    normCount += g.attributes.normal.count
    uvCount += g.attributes.uv.count
    idxCount += g.index ? g.index.count : g.attributes.position.count
  }
  const positions = new Float32Array(posCount * 3)
  const normals = new Float32Array(normCount * 3)
  const uvs = new Float32Array(uvCount * 2)
  const indices = new Uint32Array(idxCount)
  let pOff = 0, nOff = 0, uOff = 0, iOff = 0, vBase = 0
  for (const g of geos) {
    const p = g.attributes.position.array as ArrayLike<number>
    positions.set(p, pOff); pOff += g.attributes.position.count * 3
    const n = g.attributes.normal.array as ArrayLike<number>
    normals.set(n, nOff); nOff += g.attributes.normal.count * 3
    const u = g.attributes.uv.array as ArrayLike<number>
    uvs.set(u, uOff); uOff += g.attributes.uv.count * 2
    if (g.index) {
      const idx = g.index.array as ArrayLike<number>
      for (let i = 0; i < idx.length; i++) indices[iOff + i] = idx[i] + vBase
      iOff += idx.length
    } else {
      for (let i = 0; i < g.attributes.position.count; i++) indices[iOff + i] = i + vBase
      iOff += g.attributes.position.count
    }
    vBase += g.attributes.position.count
  }
  const merged = new THREE.BufferGeometry()
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  merged.setIndex(new THREE.BufferAttribute(indices, 1))
  return merged
}

const LSystemRules: Record<string, string> = {
  F: 'FF+[+F-F-F]-[-F+F+F]',
}
const LSystemAxiom = 'F'
const LSystemIterations = 4
const BaseBranchAngle = THREE.MathUtils.degToRad(27.5)

function pickBlossomColor(rng: () => number): THREE.Color {
  const color = new THREE.Color()
  const v = rng()
  if (v < 0.3) color.setHex(0xffb7c5)
  else if (v < 0.6) color.setHex(0xff9eb5)
  else if (v < 0.85) color.setHex(0xffc0cb)
  else color.setHex(0xffffff)
  return color
}

interface TrunkSegment {
  start: THREE.Vector3
  end: THREE.Vector3
  startRadius: number
  endRadius: number
}

interface TreeData {
  trunkSegments: TrunkSegment[]
  blossomMatrices: THREE.Matrix4[]
  blossomColors: THREE.Color[]
}

interface TurtleState {
  pos: THREE.Vector3
  dir: THREE.Vector3
  thickness: number
  depth: number
}

function expandLSystem(axiom: string, rules: Record<string, string>, iterations: number): string {
  let current = axiom
  for (let i = 0; i < iterations; i++) {
    let next = ''
    for (const char of current) {
      next += rules[char] ?? char
    }
    current = next
  }
  return current
}

function isTerminalSegment(instructions: string, index: number): boolean {
  for (let j = index + 1; j < instructions.length; j++) {
    const c = instructions[j]
    if (c === '[') return false
    if (c === ']') return true
  }
  return true
}

function turnDirection(dir: THREE.Vector3, angleRad: number): void {
  const up = new THREE.Vector3(0, 1, 0)
  let axis = new THREE.Vector3().crossVectors(dir, up)
  if (axis.lengthSq() < 0.001) {
    axis.set(1, 0, 0)
  } else {
    axis.normalize()
  }
  dir.applyAxisAngle(axis, angleRad)
  dir.y = Math.abs(dir.y) * 0.6 + 0.4
  dir.normalize()
}

function addBlossoms(
  pos: THREE.Vector3,
  spread: number,
  rng: () => number,
  blossomMatrices: THREE.Matrix4[],
  blossomColors: THREE.Color[],
): void {
  const blossomCount = Math.floor(rng() * 5) + 3
  for (let b = 0; b < blossomCount; b++) {
    const bPos = pos.clone().add(
      new THREE.Vector3(
        (rng() - 0.5) * spread * 0.8,
        rng() * 0.6 + 0.15,
        (rng() - 0.5) * spread * 0.8,
      ),
    )
    const bSize = rng() * 0.35 + 0.25
    const rotY = rng() * Math.PI * 2

    const bMat = new THREE.Matrix4()
    const bQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, rotY, (rng() - 0.5) * 0.4),
    )
    bMat.compose(bPos, bQuat, new THREE.Vector3(bSize, bSize * 1.1, 1))
    blossomMatrices.push(bMat)
    blossomColors.push(pickBlossomColor(rng))
  }
}

function generateTree(
  origin: THREE.Vector3,
  seed: number,
  height: number,
  spread: number,
): TreeData {
  const trunkSegments: TrunkSegment[] = []
  const blossomMatrices: THREE.Matrix4[] = []
  const blossomColors: THREE.Color[] = []
  const rng = mulberry32(seed)

  const instructions = expandLSystem(LSystemAxiom, LSystemRules, LSystemIterations)
  const segmentLength = height / 12
  const baseThickness = 0.15
  const lengthDecay = 0.62
  const thicknessDecay = 0.55

  const stack: TurtleState[] = []
  let pos = origin.clone()
  let dir = new THREE.Vector3(0, 1, 0)
  let thickness = baseThickness
  let depth = 0

  for (let i = 0; i < instructions.length; i++) {
    const char = instructions[i]
    const angleJitter = 1 + (rng() - 0.5) * 0.4
    const lengthJitter = 1 + (rng() - 0.5) * 0.4

    switch (char) {
      case 'F': {
        const len = segmentLength * Math.pow(lengthDecay, depth) * lengthJitter
        if (len < 0.15) break

        const startRadius = Math.max(0.02, thickness * Math.pow(thicknessDecay, depth))
        const end = pos.clone().add(dir.clone().multiplyScalar(len))
        // 末端半径略小于起点（锥度），用当前 depth+1 估算子段粗细
        const endRadius = Math.max(0.015, thickness * Math.pow(thicknessDecay, depth + 1) * 0.9)

        trunkSegments.push({ start: pos.clone(), end: end.clone(), startRadius, endRadius })

        if (depth >= 3 && isTerminalSegment(instructions, i)) {
          addBlossoms(end, spread, rng, blossomMatrices, blossomColors)
        }

        pos = end
        break
      }
      case '+':
        turnDirection(dir, BaseBranchAngle * angleJitter)
        break
      case '-':
        turnDirection(dir, -BaseBranchAngle * angleJitter)
        break
      case '[':
        stack.push({ pos: pos.clone(), dir: dir.clone(), thickness, depth })
        depth++
        thickness *= thicknessDecay * (0.85 + rng() * 0.15)
        break
      case ']': {
        const state = stack.pop()
        if (state) {
          pos = state.pos
          dir = state.dir
          thickness = state.thickness
          depth = state.depth
        }
        break
      }
    }
  }

  return { trunkSegments, blossomMatrices, blossomColors }
}

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

export function ProceduralTrees() {
  const groupRef = useRef<THREE.Group>(null)

  const petalTex = useMemo(() => createPetalAlphaTexture(), [])
  const blossomMaterial = useMemo(
    () => createBillboardMaterial(petalTex),
    [petalTex],
  )

  useEffect(() => {
    if (!groupRef.current) return

    while (groupRef.current.children.length > 0) {
      const child = groupRef.current.children[0]
      groupRef.current.remove(child)
      if (child instanceof THREE.Mesh || child instanceof THREE.InstancedMesh) {
        child.geometry.dispose()
        ;(child.material as THREE.Material).dispose()
      }
    }

    const allTrunkSegments: TrunkSegment[] = []
    const allBlossomMatrices: THREE.Matrix4[] = []
    const allBlossomColors: THREE.Color[] = []

    const treeCount = 300
    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2
      const baseR = 8 + Math.sin(i * 4.7) * 5
      const r = baseR + Math.sin(i * 7.3) * 8
      let x = Math.cos(angle + Math.sin(i * 0.3) * 2) * r
      let z = Math.sin(angle + Math.sin(i * 0.3) * 2) * r
      z = -55 + Math.abs(z) * 0.8

      const streamX = Math.sin(((z + 60) / 120) * Math.PI * 3) * 6 + Math.sin(((z + 60) / 120) * Math.PI * 7) * 2
      if (Math.abs(x - streamX) < 5) continue

      const caveDist = Math.sqrt(x * x + (z + 50) * (z + 50))
      if (caveDist < 10) continue

      const seed = i * 12345 + 67890
      const height = 2.5 + Math.sin(i * 3.1) * 1.2
      const spread = 1.2 + Math.sin(i * 2.7) * 0.5

      let terrainY = 0
      terrainY += noise2D(x * 0.02, z * 0.02) * 6
      terrainY += noise2D(x * 0.05, z * 0.05) * 2
      terrainY += noise2D(x * 0.1, z * 0.1) * 0.5
      if (terrainY < -0.3) continue

      const tree = generateTree(new THREE.Vector3(x, terrainY, z), seed, height, spread)
      allTrunkSegments.push(...tree.trunkSegments)
      allBlossomMatrices.push(...tree.blossomMatrices)
      allBlossomColors.push(...tree.blossomColors)
    }

    if (allTrunkSegments.length > 0) {
      // 每段构建锥形圆柱，然后合并成一个 BufferGeometry（消除拼接缝）
      const segGeos = allTrunkSegments.map((s) => buildSegmentCylinder(s.start, s.end, s.startRadius, s.endRadius, 10))
      const mergedTrunkGeo = mergeSegmentGeometries(segGeos)
      // 释放临时几何
      segGeos.forEach((g) => g.dispose())
      const trunkMat = new THREE.MeshStandardMaterial({
        color: 0x5d4037,
        roughness: 0.95,
        map: PbrTextures.wood([1, 3]),
        roughnessMap: PbrTextures.woodRough([1, 3]),
      })
      const trunkMesh = new THREE.Mesh(mergedTrunkGeo, trunkMat)
      trunkMesh.castShadow = true
      trunkMesh.receiveShadow = true
      groupRef.current.add(trunkMesh)
    }

    if (allBlossomMatrices.length > 0) {
      const blossomGeo = new THREE.PlaneGeometry(1, 1)
      const blossomMesh = new THREE.InstancedMesh(
        blossomGeo,
        blossomMaterial,
        allBlossomMatrices.length,
      )
      allBlossomMatrices.forEach((m, i) => blossomMesh.setMatrixAt(i, m))
      blossomMesh.instanceColor = buildInstancedColors(allBlossomColors)
      blossomMesh.instanceMatrix.needsUpdate = true
      blossomMesh.castShadow = false
      groupRef.current.add(blossomMesh)
    }
  }, [blossomMaterial])

  return <group ref={groupRef} />
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
  const count = 2000

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

    for (let i = 0; i < count; i++) {
      const x = (rng() - 0.5) * 100
      const z = (rng() - 0.5) * 100

      let y = 0
      y += noise2D(x * 0.02, z * 0.02) * 6
      y += noise2D(x * 0.05, z * 0.05) * 2
      y += noise2D(x * 0.1, z * 0.1) * 0.5
      if (y < -0.2) {
        mat.identity()
        mat.makeScale(0, 0, 0)
        meshRef.current.setMatrixAt(i, mat)
        colors.push(GRASS_COLORS[0])
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
      meshRef.current.setMatrixAt(i, mat)
      colors.push(GRASS_COLORS[Math.floor(rng() * GRASS_COLORS.length)])
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
