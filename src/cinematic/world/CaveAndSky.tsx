import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

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
 * 洞口装饰：藤蔓（垂下的细圆柱串绿色叶球）+ 苔藓（绿色小球簇）。
 * 覆盖在 z=-62 洞口（torus 半径 4）周围。
 */
function CaveFoliage() {
  // 洞口本地坐标系：torus 在 (0,3,0)，半径 4，半环。
  // 藤蔓从洞顶/洞壁垂下。
  const vines = useMemo(() => {
    const rng = makeRng(7)
    return Array.from({ length: 8 }, () => {
      const ang = rng() * Math.PI // 半环角度
      const r = 3.2 + rng() * 1.4
      return {
        x: Math.cos(ang) * r,
        y: 3 + rng() * 1.5, // 顶部
        z: Math.sin(ang) * r * 0.3 - 0.5,
        len: 1.2 + rng() * 1.6,
        segs: 3,
      }
    })
  }, [])

  const moss = useMemo(() => {
    const rng = makeRng(23)
    return Array.from({ length: 16 }, () => {
      const ang = rng() * Math.PI
      const r = 3.6 + rng() * 1.2
      return {
        x: Math.cos(ang) * r,
        y: rng() * 1.2,
        z: Math.sin(ang) * r * 0.4 - 0.3,
        s: 0.2 + rng() * 0.3,
        c: rng() > 0.5 ? 0x4a7c3a : 0x3f6b35,
      }
    })
  }, [])

  return (
    <group position={[0, 0, -62]}>
      {/* 藤蔓：垂直细圆柱 + 末端几片叶球 */}
      {vines.map((v, i) => (
        <group key={`v${i}`} position={[v.x, v.y, v.z]}>
          <mesh position={[0, -v.len / 2, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.05, v.len, 5]} />
            <meshStandardMaterial color={0x4a6b2a} roughness={1} />
          </mesh>
          {/* 末端叶簇 */}
          <mesh position={[0, -v.len, 0]} castShadow>
            <sphereGeometry args={[0.22, 8, 6]} />
            <meshStandardMaterial color={0x3f6b35} roughness={1} />
          </mesh>
          <mesh position={[0.15, -v.len + 0.1, 0.05]} castShadow>
            <sphereGeometry args={[0.13, 6, 5]} />
            <meshStandardMaterial color={0x4a7c3a} roughness={1} />
          </mesh>
        </group>
      ))}
      {/* 苔藓小球簇贴在洞口石壁根部 */}
      {moss.map((m, i) => (
        <mesh key={`m${i}`} position={[m.x, m.y, m.z]} scale={m.s} castShadow>
          <sphereGeometry args={[1, 8, 6]} />
          <meshStandardMaterial color={m.c} roughness={1} />
        </mesh>
      ))}
      {/* 洞内深处更明显的暖光（比 CinematicWorld 里已有的更靠里） */}
      <pointLight position={[0, 2.5, -5]} color={0xffb86b} intensity={1.6} distance={9} />
    </group>
  )
}

/**
 * 飞鸟：简单 V 形（两条细圆柱/线段）在天上盘旋，
 * 用 useFrame 让整群绕一个大圆缓慢旋转。
 */
function FlyingBirds() {
  const flockRef = useRef<THREE.Group>(null)

  const birds = useMemo(() => {
    const rng = makeRng(404)
    return Array.from({ length: 6 }, () => ({
      // 在大圆上的相对位置（半径、高度、相位）
      r: 28 + rng() * 10,
      y: 24 + rng() * 6,
      phase: rng() * Math.PI * 2,
      scale: 0.8 + rng() * 0.5,
      flapPhase: rng() * 6.28,
    }))
  }, [])

  // 单只鸟：V 形（两根细斜圆柱）
  const birdRefs = useRef<THREE.Group[]>([])

  useFrame((state) => {
    const flock = flockRef.current
    if (!flock) return
    const t = state.clock.elapsedTime
    // 整群缓慢绕中心旋转
    flock.rotation.y = t * 0.08
    // 每只鸟的翅膀扇动（绕 z 轴微张合）
    for (let i = 0; i < birds.length; i++) {
      const bg = birdRefs.current[i]
      if (!bg) continue
      const wingL = bg.children[0] as THREE.Mesh
      const wingR = bg.children[1] as THREE.Mesh
      const flap = Math.sin(t * 4 + birds[i].flapPhase) * 0.35 + 0.2
      if (wingL) wingL.rotation.z = flap
      if (wingR) wingR.rotation.z = -flap
    }
  })

  return (
    <group ref={flockRef} position={[0, 0, -40]}>
      {birds.map((b, i) => (
        <group
          key={i}
          ref={(el) => {
            if (el) birdRefs.current[i] = el
          }}
          position={[Math.cos(b.phase) * b.r, b.y, Math.sin(b.phase) * b.r]}
          scale={b.scale}
          // 鸟面朝飞行切线方向（近似）
          rotation={[0, -b.phase + Math.PI / 2, 0]}
        >
          {/* 左翅 */}
          <mesh position={[0.4, 0, 0]} rotation={[0, 0, 0.2]}>
            <boxGeometry args={[0.7, 0.04, 0.12]} />
            <meshStandardMaterial color={0x2b2b2b} roughness={1} />
          </mesh>
          {/* 右翅 */}
          <mesh position={[-0.4, 0, 0]} rotation={[0, 0, -0.2]}>
            <boxGeometry args={[0.7, 0.04, 0.12]} />
            <meshStandardMaterial color={0x2b2b2b} roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/**
 * 远山云雾层：白色半透明大 plane 立在山前，
 * 缓慢横向漂移。两片错开，营造仙气云海。
 */
function DistantClouds() {
  const cloudRefs = useRef<THREE.Mesh[]>([])

  const clouds = useMemo(() => {
    return [
      { pos: [0, 14, -75] as [number, number, number], scale: [120, 18, 1] as [number, number, number], speed: 0.4, opacity: 0.32 },
      { pos: [0, 18, -95] as [number, number, number], scale: [140, 22, 1] as [number, number, number], speed: 0.25, opacity: 0.22 },
    ]
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    clouds.forEach((c, i) => {
      const m = cloudRefs.current[i]
      if (!m) return
      // 横向缓慢漂移，用取模形成无缝循环（在一个可见范围里来回）
      m.position.x = Math.sin(t * c.speed) * 8
    })
  })

  return (
    <>
      {clouds.map((c, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) cloudRefs.current[i] = el
          }}
          position={c.pos}
          scale={c.scale}
        >
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial
            color={0xffffff}
            transparent
            opacity={c.opacity}
            roughness={1}
            depthWrite={false}
            fog={false}
          />
        </mesh>
      ))}
    </>
  )
}

/**
 * 洞口 + 天空附加细节总成。
 */
export function CaveAndSky() {
  return (
    <group>
      <CaveFoliage />
      <FlyingBirds />
      <DistantClouds />
    </group>
  )
}
