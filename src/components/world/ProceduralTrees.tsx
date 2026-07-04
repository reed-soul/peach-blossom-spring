import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createNoise2D } from 'simplex-noise'
import { PbrTextures } from '../../cinematic/textures/PbrTextures'
import { createPetalAlphaTexture, createGrassAlphaTexture } from './proceduralTextures'
import { createBillboardMaterial } from './shaders/billboardInstanced'

const noise2D = createNoise2D()

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

interface TreeData {
  trunkMatrices: THREE.Matrix4[]
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
  const trunkMatrices: THREE.Matrix4[] = []
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

  const up = new THREE.Vector3(0, 1, 0)

  for (let i = 0; i < instructions.length; i++) {
    const char = instructions[i]
    const angleJitter = 1 + (rng() - 0.5) * 0.4
    const lengthJitter = 1 + (rng() - 0.5) * 0.4

    switch (char) {
      case 'F': {
        const len = segmentLength * Math.pow(lengthDecay, depth) * lengthJitter
        if (len < 0.15) break

        const thick = Math.max(0.02, thickness * Math.pow(thicknessDecay, depth))
        const end = pos.clone().add(dir.clone().multiplyScalar(len))
        const mid = pos.clone().lerp(end, 0.5)

        const mat = new THREE.Matrix4()
        const quat = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize())
        mat.compose(mid, quat, new THREE.Vector3(thick, len / 2, thick))
        trunkMatrices.push(mat)

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

  return { trunkMatrices, blossomMatrices, blossomColors }
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
      if (child instanceof THREE.InstancedMesh) {
        child.geometry.dispose()
        ;(child.material as THREE.Material).dispose()
      }
    }

    const allTrunkMatrices: THREE.Matrix4[] = []
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
      allTrunkMatrices.push(...tree.trunkMatrices)
      allBlossomMatrices.push(...tree.blossomMatrices)
      allBlossomColors.push(...tree.blossomColors)
    }

    if (allTrunkMatrices.length > 0) {
      const trunkGeo = new THREE.CylinderGeometry(1, 1, 1, 10)
      const trunkMat = new THREE.MeshStandardMaterial({
        color: 0x5d4037,
        roughness: 1,
        map: PbrTextures.wood([1, 3]),
      })
      const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, allTrunkMatrices.length)
      allTrunkMatrices.forEach((m, i) => trunkMesh.setMatrixAt(i, m))
      trunkMesh.instanceMatrix.needsUpdate = true
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
