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
 * 石板小路：灰色长条 box 串联，贯穿村庄主道（z -72..-95）。
 * 微微高低错落、随机旋转，模拟年代感的石板路。
 */
function StonePath() {
  const stones = useMemo(() => {
    const rng = makeRng(11)
    const arr: {
      pos: [number, number, number]
      scale: [number, number, number]
      rot: number
    }[] = []
    for (let i = 0; i < 24; i++) {
      const z = -72 - i * 1.05
      const x = Math.sin(i * 0.7) * 0.6 + (rng() - 0.5) * 0.8
      arr.push({
        pos: [x, 0.08, z],
        scale: [1.3 + rng() * 0.4, 0.16, 0.8 + rng() * 0.25],
        rot: (rng() - 0.5) * 0.4,
      })
    }
    return arr
  }, [])

  return (
    <>
      {stones.map((s, i) => (
        <mesh
          key={i}
          position={s.pos}
          rotation={[0, s.rot, 0]}
          scale={s.scale}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={0x8a8275} roughness={1} />
        </mesh>
      ))}
    </>
  )
}

/**
 * 篱笆：细木条围栏，沿村庄几处田地边界。
 */
function Fences() {
  // 用一个函数生成一段栅栏（一串竖木条 + 横梁）
  function fenceSegment(start: [number, number, number], end: [number, number, number]) {
    const posts: {
      pos: [number, number, number]
    }[] = []
    const dx = end[0] - start[0]
    const dz = end[2] - start[2]
    const len = Math.sqrt(dx * dx + dz * dz)
    const seg = Math.max(2, Math.round(len / 1.6))
    for (let i = 0; i <= seg; i++) {
      const t = i / seg
      posts.push({
        pos: [start[0] + dx * t, 0, start[2] + dz * t],
      })
    }
    return { posts, start, end, len, ang: Math.atan2(dz, dx) }
  }

  const segments = useMemo(() => {
    return [
      fenceSegment([-16, 0, -76], [-16, 0, -90]),
      fenceSegment([16, 0, -76], [16, 0, -90]),
      fenceSegment([-16, 0, -76], [16, 0, -76]),
    ]
  }, [])

  return (
    <>
      {segments.map((seg, si) => (
        <group key={si}>
          {seg.posts.map((p, pi) => (
            <mesh key={pi} position={[p.pos[0], 0.55, p.pos[2]]} castShadow>
              <cylinderGeometry args={[0.06, 0.07, 1.1, 6]} />
              <meshStandardMaterial color={0x6b4f3a} roughness={1} />
            </mesh>
          ))}
          {/* 两道横梁 */}
          {[0.85, 0.4].map((h, hi) => (
            <mesh
              key={`b${hi}`}
              position={[
                (seg.start[0] + seg.end[0]) / 2,
                h,
                (seg.start[2] + seg.end[2]) / 2,
              ]}
              rotation={[0, -seg.ang, 0]}
              castShadow
            >
              <boxGeometry args={[seg.len, 0.07, 0.07]} />
              <meshStandardMaterial color={0x7a5a42} roughness={1} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  )
}

/**
 * 桑树 / 竹子丛：绿色细高圆锥/圆柱丛，点缀在田边。
 */
function MulberryAndBamboo() {
  const plants = useMemo(() => {
    const rng = makeRng(57)
    const arr: {
      pos: [number, number, number]
      kind: 'mulberry' | 'bamboo'
      scale: number
      rot: number
    }[] = []
    // 桑树（树冠圆锥）
    const mulberrySpots: [number, number][] = [
      [-18, -80], [-19, -85], [18, -82], [17, -88], [-13, -92], [14, -91],
    ]
    for (const [x, z] of mulberrySpots) {
      arr.push({
        pos: [x + (rng() - 0.5) * 1.2, 0, z + (rng() - 0.5) * 1.2],
        kind: 'mulberry',
        scale: 0.9 + rng() * 0.5,
        rot: rng() * 6.28,
      })
    }
    // 竹丛（几根细高圆柱顶部带小叶）
    const bambooSpots: [number, number][] = [
      [-20, -77], [20, -86], [-15, -93], [19, -78], [-21, -88],
    ]
    for (const [x, z] of bambooSpots) {
      arr.push({
        pos: [x, 0, z],
        kind: 'bamboo',
        scale: 0.85 + rng() * 0.5,
        rot: rng() * 6.28,
      })
    }
    return arr
  }, [])

  return (
    <>
      {plants.map((p, i) =>
        p.kind === 'mulberry' ? (
          <group key={i} position={p.pos} rotation={[0, p.rot, 0]} scale={p.scale}>
            <mesh position={[0, 1.2, 0]} castShadow>
              <cylinderGeometry args={[0.12, 0.18, 2.4, 6]} />
              <meshStandardMaterial color={0x5d4037} roughness={1} />
            </mesh>
            {/* 桑树圆冠（深绿） */}
            <mesh position={[0, 3, 0]} castShadow>
              <sphereGeometry args={[1.3, 10, 8]} />
              <meshStandardMaterial color={0x3f6b35} roughness={1} />
            </mesh>
            <mesh position={[0.6, 2.6, 0.4]} castShadow>
              <sphereGeometry args={[0.7, 8, 6]} />
              <meshStandardMaterial color={0x4a7c3a} roughness={1} />
            </mesh>
          </group>
        ) : (
          <BambooCluster key={i} base={p.pos} scale={p.scale} seed={i} />
        ),
      )}
    </>
  )
}

function BambooCluster({
  base,
  scale,
  seed,
}: {
  base: [number, number, number]
  scale: number
  seed: number
}) {
  const stalks = useMemo(() => {
    const rng = makeRng(seed * 13 + 1)
    return Array.from({ length: 5 }, () => ({
      off: [(rng() - 0.5) * 1.2, (rng() - 0.5) * 1.2] as [number, number],
      h: 3.2 + rng() * 1.4,
      r: 0.05 + rng() * 0.03,
      lean: (rng() - 0.5) * 0.15,
    }))
  }, [seed])

  return (
    <group position={base} scale={scale}>
      {stalks.map((s, i) => (
        <group key={i} position={[s.off[0], 0, s.off[1]]} rotation={[0, 0, s.lean]}>
          <mesh position={[0, s.h / 2, 0]} castShadow>
            <cylinderGeometry args={[s.r, s.r * 1.3, s.h, 6]} />
            <meshStandardMaterial color={0x6b8e4e} roughness={1} />
          </mesh>
          {/* 顶部竹叶小球 */}
          <mesh position={[0, s.h + 0.1, 0]} castShadow>
            <sphereGeometry args={[0.35, 8, 6]} />
            <meshStandardMaterial color={0x5a8c3a} roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/**
 * 水井：圆柱井口 + 横梁 + 吊桶。
 */
function Well({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* 井口石圈 */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.9, 1.0, 1, 12]} />
        <meshStandardMaterial color={0x8a8275} roughness={1} />
      </mesh>
      {/* 井内深色 */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 0.6, 12]} />
        <meshStandardMaterial color={0x2a3a3a} roughness={1} />
      </mesh>
      {/* 两根立柱 */}
      <mesh position={[-0.8, 1.6, 0]} castShadow>
        <boxGeometry args={[0.14, 2.2, 0.14]} />
        <meshStandardMaterial color={0x6b4f3a} roughness={1} />
      </mesh>
      <mesh position={[0.8, 1.6, 0]} castShadow>
        <boxGeometry args={[0.14, 2.2, 0.14]} />
        <meshStandardMaterial color={0x6b4f3a} roughness={1} />
      </mesh>
      {/* 横梁 */}
      <mesh position={[0, 2.7, 0]} castShadow>
        <boxGeometry args={[1.9, 0.16, 0.16]} />
        <meshStandardMaterial color={0x7a5a42} roughness={1} />
      </mesh>
      {/* 吊桶（挂在横梁一侧） */}
      <mesh position={[0.3, 1.9, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.4, 8]} />
        <meshStandardMaterial color={0x5d4037} roughness={1} />
      </mesh>
    </group>
  )
}

/**
 * 晾晒的衣物：小块布挂在杆上，简单旋转摆动。
 */
function ClothesLine() {
  const lineRef = useRef<THREE.Group>(null)
  const COUNT = 6

  const items = useMemo(() => {
    const rng = makeRng(91)
    const colors = [0xd8c4a0, 0xc97b6b, 0x8fa8c4, 0xb5b5a0, 0xc9a06b, 0x9bb59b]
    // 绳子从 (-6, 2.2, -88) 到 (6, 2.2, -88)
    return Array.from({ length: COUNT }, (_, i) => {
      const t = (i + 0.5) / COUNT
      return {
        x: -6 + t * 12,
        color: colors[i % colors.length],
        scale: 0.9 + rng() * 0.4,
        swayPhase: rng() * 6.28,
        swaySpeed: 1 + rng() * 0.8,
      }
    })
  }, [])

  useFrame((state) => {
    const g = lineRef.current
    if (!g) return
    const t = state.clock.elapsedTime
    for (let i = 0; i < COUNT; i++) {
      const child = g.children[i] as THREE.Mesh | undefined
      if (!child) continue
      child.rotation.z = Math.sin(t * items[i].swaySpeed + items[i].swayPhase) * 0.18
    }
  })

  return (
    <group>
      {/* 两根晾衣杆 */}
      <mesh position={[-6.5, 1.5, -88]} castShadow>
        <cylinderGeometry args={[0.06, 0.07, 3, 6]} />
        <meshStandardMaterial color={0x6b4f3a} roughness={1} />
      </mesh>
      <mesh position={[6.5, 1.5, -88]} castShadow>
        <cylinderGeometry args={[0.06, 0.07, 3, 6]} />
        <meshStandardMaterial color={0x6b4f3a} roughness={1} />
      </mesh>
      {/* 横杆 */}
      <mesh position={[0, 2.2, -88]} rotation={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 13, 6]} />
        <meshStandardMaterial color={0x7a5a42} roughness={1} />
      </mesh>
      <group ref={lineRef}>
        {items.map((it, i) => (
          <mesh key={i} position={[it.x, 1.6, -88]} scale={[it.scale, it.scale, 1]}>
            <planeGeometry args={[0.7, 1.1]} />
            <meshStandardMaterial
              color={it.color}
              side={THREE.DoubleSide}
              roughness={1}
            />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/**
 * 田间农夫小人：简单胶囊体（身体）+ 球（头），棕色衣服，静止点缀。
 */
function Farmers() {
  const farmers = useMemo(() => {
    const spots: { pos: [number, number, number]; rot: number }[] = [
      { pos: [-5, 0, -85], rot: 0.5 },
      { pos: [6, 0, -88], rot: -0.8 },
      { pos: [-9, 0, -91], rot: 1.2 },
    ]
    return spots
  }, [])

  return (
    <>
      {farmers.map((f, i) => (
        <group key={i} position={f.pos} rotation={[0, f.rot, 0]}>
          {/* 身体（棕色衣服） */}
          <mesh position={[0, 0.7, 0]} castShadow>
            <capsuleGeometry args={[0.28, 0.7, 4, 8]} />
            <meshStandardMaterial color={0x7a5234} roughness={1} />
          </mesh>
          {/* 头 */}
          <mesh position={[0, 1.45, 0]} castShadow>
            <sphereGeometry args={[0.22, 10, 8]} />
            <meshStandardMaterial color={0xe0b890} roughness={1} />
          </mesh>
          {/* 头巾/帽子（米色） */}
          <mesh position={[0, 1.6, 0]}>
            <coneGeometry args={[0.3, 0.25, 8]} />
            <meshStandardMaterial color={0xd8c4a0} roughness={1} />
          </mesh>
        </group>
      ))}
    </>
  )
}

/**
 * 村庄附加细节总成（在 CinematicWorld 的村庄段调用）：
 * 石板路 + 篱笆 + 桑竹 + 水井 + 晾衣 + 农夫。
 */
export function VillageDetails() {
  return (
    <group>
      <StonePath />
      <Fences />
      <MulberryAndBamboo />
      <Well position={[-13, 0, -83]} />
      <ClothesLine />
      <Farmers />
    </group>
  )
}
