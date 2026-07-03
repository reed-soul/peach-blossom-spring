import { Suspense, useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import * as THREE from 'three'
import { Terrain } from '../../components/world/Terrain'
import { Stream } from '../../components/world/Stream'
import { MountainRange } from '../../components/world/MountainRange'
import {
  ProceduralTrees,
  GroundCover,
  Rocks,
} from '../../components/world/ProceduralTrees'
import { PetalParticles } from '../../components/world/PetalParticles'

// 体积光（god ray）：半透圆锥模拟阳光光柱（Cursor 重构 PeachForestScene 后
// 原 GodRay 导出已不存在，这里本地保留一份供 cinematic 使用）
function GodRay({ position, target }: { position: [number, number, number]; target: [number, number, number] }) {
  // 圆锥默认朝 +y，计算朝向 target 的旋转
  const dir = useMemo(() => {
    const d = new THREE.Vector3(...target).sub(new THREE.Vector3(...position))
    const len = d.length()
    if (len < 0.01) return { rot: [0, 0, 0] as [number, number, number], mid: position }
    // 朝向方向 → 旋转（圆锥轴 +y 对齐到 dir）
    const up = new THREE.Vector3(0, 1, 0)
    const quat = new THREE.Quaternion().setFromUnitVectors(up, d.clone().normalize())
    const e = new THREE.Euler().setFromQuaternion(quat)
    const mid = new THREE.Vector3(...position).add(d.clone().multiplyScalar(0.5))
    return { rot: [e.x, e.y, e.z] as [number, number, number], mid: [mid.x, mid.y, mid.z] as [number, number, number] }
  }, [position, target])
  return (
    <mesh position={dir.mid} rotation={dir.rot}>
      <coneGeometry args={[2.5, 15, 8, 1, true]} />
      <meshBasicMaterial color={0xffe8c0} transparent opacity={0.05} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  )
}
import { ForestDetails } from './ForestDetails'
import { VillageDetails } from './VillageDetails'
import { CaveAndSky } from './CaveAndSky'

// 电影模式固定明亮的暖调光照（不走 DayNightCycle 的昼夜变化，保证全程氛围稳定）
function BrightLighting() {
  const { scene } = useThree()
  useEffect(() => {
    const prevFog = scene.fog
    const prevBg = scene.background
    scene.fog = new THREE.Fog(new THREE.Color('#e8d8c0'), 30, 130)
    scene.background = new THREE.Color('#dfe6f0')
    return () => {
      scene.fog = prevFog
      scene.background = prevBg
    }
  }, [scene])

  return (
    <>
      {/* 主光：暖白阳光，高角度，柔和阴影 */}
      <directionalLight
        position={[25, 40, 15]}
        intensity={1.6}
        color={0xfff2dc}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-bias={-0.0005}
      />
      {/* 天光：明亮的天蓝半球光，照亮阴影区 */}
      <hemisphereLight args={[0xbfd8ff, 0x6b5a3a, 0.85]} />
      {/* 环境补光，避免纯黑 */}
      <ambientLight intensity={0.35} />
      {/* 逆光轮廓：让角色从背景中分离（仙侠感） */}
      <directionalLight position={[-15, 20, -25]} intensity={0.5} color={0xffd8a0} />
    </>
  )
}

// 村庄房屋（与 VillageScene 风格一致，无交互）
function VillageHouse({
  position,
  rotation = 0,
  scale = 1,
}: {
  position: [number, number, number]
  rotation?: number
  scale?: number
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[4, 3, 3]} />
        <meshStandardMaterial color={0xf0dcb8} roughness={0.9} />
      </mesh>
      <mesh position={[0, 3.8, 0]} castShadow>
        <coneGeometry args={[3.5, 2, 4]} />
        <meshStandardMaterial color={0x2d2d2d} roughness={1} />
      </mesh>
      <mesh position={[0, 1.2, 1.51]}>
        <planeGeometry args={[1, 2.4]} />
        <meshStandardMaterial color={0x5d4037} />
      </mesh>
    </group>
  )
}

function Lantern({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.4, 0.4, 0.8, 8]} />
        <meshStandardMaterial
          color={0xcc0000}
          emissive={0x880000}
          emissiveIntensity={0.5}
        />
      </mesh>
      <pointLight color={0xffd27a} intensity={2} distance={10} />
    </group>
  )
}

function VillageArea() {
  const houses: Array<{ p: [number, number, number]; r: number; s: number }> = [
    { p: [-10, 0, -78], r: 0.3, s: 1.1 },
    { p: [8, 0, -82], r: -0.2, s: 1.2 },
    { p: [-6, 0, -88], r: 0.5, s: 0.95 },
    { p: [11, 0, -90], r: -0.4, s: 1.05 },
    { p: [0, 0, -94], r: 0, s: 1.3 },
  ]
  return (
    <group>
      {houses.map((h, i) => (
        <VillageHouse key={i} position={h.p} rotation={h.r} scale={h.s} />
      ))}
      <Lantern position={[-9, 4, -78]} />
      <Lantern position={[9, 4, -82]} />
      <Lantern position={[0, 4, -94]} />
      {/* 田地色块 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -82]} receiveShadow>
        <planeGeometry args={[40, 30]} />
        <meshStandardMaterial color={0x5a7a3a} roughness={1} />
      </mesh>
      {/* 池塘 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[14, 0.05, -84]}>
        <circleGeometry args={[5, 32]} />
        <meshStandardMaterial
          color={0x2e8b8b}
          transparent
          opacity={0.55}
          roughness={0.1}
        />
      </mesh>
      {/* 村庄周围桃树 */}
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i / 24) * Math.PI * 2
        const r = 18 + Math.sin(i * 4.7) * 5
        return (
          <group key={i} position={[Math.cos(angle) * r, 0, Math.sin(angle) * r - 84]}>
            <mesh position={[0, 2.5, 0]} castShadow>
              <cylinderGeometry args={[0.15, 0.25, 5, 6]} />
              <meshStandardMaterial color={0x5d4037} />
            </mesh>
            <mesh position={[0, 5.5, 0]}>
              <sphereGeometry args={[2, 8, 6]} />
              <meshStandardMaterial color={0xffb7c5} roughness={0.85} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

export function CinematicWorld() {
  return (
    <Suspense fallback={null}>
      {/* 固定明亮的暖调光照（电影模式全程氛围稳定） */}
      <BrightLighting />

      {/* 程序化环境贴图：给金属冠/玉佩提供反射（无外部 HDR，子 mesh 作 cubemap 源） */}
      <Environment resolution={64} frames={1}>
        {/* 上方天光（暖白） */}
        <mesh scale={[8, 8, 8]} position={[0, 6, 0]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial color="#fff2dc" side={THREE.BackSide} />
        </mesh>
        {/* 侧后暖光（模拟夕阳） */}
        <mesh scale={[4, 4, 4]} position={[-4, 3, -4]}>
          <sphereGeometry args={[1, 12, 12]} />
          <meshBasicMaterial color="#ffd8a0" />
        </mesh>
        {/* 下方地面反射（暗褐） */}
        <mesh scale={[6, 6, 6]} position={[0, -3, 0]}>
          <sphereGeometry args={[1, 12, 12]} />
          <meshBasicMaterial color="#5a4a32" side={THREE.BackSide} />
        </mesh>
      </Environment>

      {/* 地形/山/溪/树复用现有组件（围绕原点~z=-50 布置） */}
      <group position={[0, 0, 0]}>
        <Terrain />
        <Stream />
        <MountainRange />
        <ProceduralTrees />
        <GroundCover />
        <Rocks />
        <PetalParticles />
      </group>

      {/* 体积光（god rays）：阳光穿过桃林花冠，配合 Bloom 发光 */}
      <GodRay position={[8, 18, -22]} target={[8, 0, -22]} />
      <GodRay position={[-10, 18, -30]} target={[-10, 0, -30]} />
      <GodRay position={[4, 18, -38]} target={[4, 0, -38]} />
      {/* 洞口一束光（'仿佛若有光'的可见化） */}
      <GodRay position={[0, 14, -58]} target={[0, 0, -62]} />

      {/* 桃林区域附加细节：落桃花团 + 地上落花毯 + 林间萤火（z≈-15..-45） */}
      <ForestDetails />

      {/* 村庄在 z=-80 一带 */}
      <VillageArea />
      {/* 村庄附加细节：石板路 + 篱笆 + 桑竹 + 水井 + 晾衣 + 农夫 */}
      <VillageDetails />

      {/* 山洞口（z=-62，与剧本对应） */}
      <group position={[0, 0, -62]}>
        <mesh position={[0, 3, 0]} castShadow>
          <torusGeometry args={[4, 2.5, 8, 12, Math.PI]} />
          <meshStandardMaterial color={0x3e2723} roughness={1} />
        </mesh>
        <mesh position={[0, 2, -1]}>
          <planeGeometry args={[8, 5]} />
          <meshBasicMaterial color={0x070707} />
        </mesh>
        <pointLight position={[0, 3, -3]} color={0xffd27a} intensity={2} distance={12} />
        {/* 洞口聚光：可见的入口光锥（'仿佛若有光'） */}
        <spotLight
          position={[0, 4, 2]}
          angle={0.6}
          penumbra={0.5}
          intensity={3}
          distance={18}
          color={0xffd8a0}
          target-position={[0, 0, -4]}
        />
      </group>
      {/* 洞口藤蔓/苔藓 + 洞内深处暖光 + 天空飞鸟/云雾 */}
      <CaveAndSky />
    </Suspense>
  )
}
