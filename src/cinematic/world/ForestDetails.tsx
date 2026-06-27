import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// 仙侠风配色（与现有暖调桃林一致）
const PETAL_FALL_COLORS = [0xffb7c5, 0xffc0cb, 0xff9eb5, 0xffe4e1]
const FIREFLY_COLOR = 0xfff2b0

// 静态随机（确定性，避免每帧抖动），单次 useMemo
function makeRng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 额外的飘落桃花团：在桃林区域 (z≈-15..-45) 上空
 * 密集补一层旋转的粉色小 plane，加强「落英缤纷」密度。
 * 用 InstancedMesh，~120 片，每帧慢速旋转 + 缓慢下落。
 */
function ExtraFallingPetals() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const COUNT = 120

  const data = useMemo(() => {
    const rng = makeRng(2024)
    return Array.from({ length: COUNT }, () => ({
      pos: new THREE.Vector3(
        (rng() - 0.5) * 36, // x: -18..18
        1 + rng() * 9, // y: 1..10
        -15 - rng() * 30, // z: -15..-45
      ),
      rot: new THREE.Euler(rng() * 6.28, rng() * 6.28, rng() * 6.28),
      rotSpeed: new THREE.Vector3(
        (rng() - 0.5) * 0.6,
        (rng() - 0.5) * 0.6,
        (rng() - 0.5) * 0.6,
      ),
      fall: 0.15 + rng() * 0.25,
      sway: rng() * 6.28,
      swayAmp: 0.2 + rng() * 0.4,
      color: PETAL_FALL_COLORS[Math.floor(rng() * PETAL_FALL_COLORS.length)],
    }))
  }, [])

  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.elapsedTime
    for (let i = 0; i < COUNT; i++) {
      const p = data[i]
      p.pos.y -= p.fall * 0.016
      p.pos.x = (p.pos.x + Math.sin(t * 0.6 + p.sway) * p.swayAmp * 0.016)
      p.rot.x += p.rotSpeed.x * 0.016
      p.rot.y += p.rotSpeed.y * 0.016
      p.rot.z += p.rotSpeed.z * 0.016
      if (p.pos.y < 0.1) {
        p.pos.set(
          (Math.sin(i * 12.9) * 18) + (Math.cos(i * 4.7) * 4),
          8 + (i % 5),
          -15 - ((i * 0.3) % 30),
        )
      }
      dummy.position.copy(p.pos)
      dummy.rotation.copy(p.rot)
      dummy.scale.set(0.5, 0.5, 0.5)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  // 实例颜色
  const colorArr = useMemo(() => {
    const arr = new Float32Array(COUNT * 3)
    const c = new THREE.Color()
    data.forEach((p, i) => {
      c.setHex(p.color)
      arr[i * 3] = c.r
      arr[i * 3 + 1] = c.g
      arr[i * 3 + 2] = c.b
    })
    return arr
  }, [data])

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, COUNT]}
      // 花瓣很小很轻，不参与投射阴影（避免性能开销与阴影闪烁）
    >
      <planeGeometry args={[0.3, 0.3]} />
      <meshStandardMaterial
        vertexColors
        side={THREE.DoubleSide}
        transparent
        opacity={0.9}
        roughness={0.85}
      />
      <instancedBufferAttribute
        attach="instanceColor"
        // vertexColors 在 InstancedMesh 上读取 instanceColor
        args={[colorArr, 3]}
      />
    </instancedMesh>
  )
}

/**
 * 地上的落花毯：几块半透明粉色 plane 平铺在桃林地面，
 * 模拟「地上铺满落花」的质感。
 */
function FallenPetalCarpet() {
  const patches = useMemo(() => {
    const rng = makeRng(88)
    return Array.from({ length: 14 }, () => ({
      pos: [
        (rng() - 0.5) * 30,
        0.05,
        -15 - rng() * 30,
      ] as [number, number, number],
      rot: rng() * Math.PI,
      scale: [4 + rng() * 5, 3 + rng() * 4, 1] as [number, number, number],
      opacity: 0.18 + rng() * 0.18,
    }))
  }, [])

  return (
    <>
      {patches.map((p, i) => (
        <mesh
          key={i}
          position={p.pos}
          rotation={[-Math.PI / 2, 0, p.rot]}
          scale={p.scale}
          receiveShadow
        >
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial
            color={0xffb7c5}
            transparent
            opacity={p.opacity}
            roughness={1}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  )
}

/**
 * 林间萤火/光点：小球 + emissive，缓慢上下浮动 + 闪烁，
 * 营造仙侠灵气。~24 个，分布在桃林中层。
 */
function Fireflies() {
  const groupRef = useRef<THREE.Group>(null)
  const COUNT = 24

  const data = useMemo(() => {
    const rng = makeRng(314)
    return Array.from({ length: COUNT }, () => ({
      base: new THREE.Vector3(
        (rng() - 0.5) * 32,
        1 + rng() * 4,
        -15 - rng() * 30,
      ),
      phase: rng() * 6.28,
      bobAmp: 0.3 + rng() * 0.5,
      bobSpeed: 0.4 + rng() * 0.5,
      driftAmp: 0.4 + rng() * 0.6,
      flickerPhase: rng() * 6.28,
    }))
  }, [])

  useFrame((state) => {
    const g = groupRef.current
    if (!g) return
    const t = state.clock.elapsedTime
    for (let i = 0; i < COUNT; i++) {
      const d = data[i]
      const child = g.children[i] as THREE.Mesh | undefined
      if (!child) continue
      child.position.set(
        d.base.x + Math.sin(t * d.bobSpeed + d.phase) * d.driftAmp,
        d.base.y + Math.sin(t * d.bobSpeed * 1.3 + d.phase) * d.bobAmp,
        d.base.z + Math.cos(t * d.bobSpeed * 0.8 + d.phase) * d.driftAmp,
      )
      const flick = 0.6 + Math.abs(Math.sin(t * 2 + d.flickerPhase)) * 0.4
      const mat = child.material as THREE.MeshStandardMaterial
      if (mat && mat.emissiveIntensity !== undefined) {
        mat.emissiveIntensity = 1.2 * flick
      }
    }
  })

  return (
    <group ref={groupRef}>
      {data.map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.08, 8, 6]} />
          <meshStandardMaterial
            color={FIREFLY_COLOR}
            emissive={FIREFLY_COLOR}
            emissiveIntensity={1.2}
            transparent
            opacity={0.95}
          />
        </mesh>
      ))}
    </group>
  )
}

/**
 * 桃林区域附加细节总成（在 CinematicWorld 的桃林段调用）：
 * 落桃花团 + 地上落花毯 + 林间萤火。
 */
export function ForestDetails() {
  return (
    <group>
      <ExtraFallingPetals />
      <FallenPetalCarpet />
      <Fireflies />
    </group>
  )
}
