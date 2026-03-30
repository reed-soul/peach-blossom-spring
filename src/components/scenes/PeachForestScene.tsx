import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useState } from 'react'
import { Sky, Environment } from '@react-three/drei'
import { PlayerController } from '../../engine/PlayerController'
import { ProceduralTrees } from '../world/ProceduralTrees'
import { PetalParticles } from '../world/PetalParticles'
import { Terrain } from '../world/Terrain'
import { Water } from '../world/Water'
import { useGameStore } from '../../store/useGameStore'
import { advanceScene } from '../../engine/SceneManager'
import * as THREE from 'three'

function CaveEntrance() {
  const ref = useRef<THREE.Group>(null)
  const { updatePosition } = useGameStore()

  useFrame(() => {
    if (!ref.current) return
    const camera = useGameStore.getState as any
    // Simple proximity check - we'll use camera position from store
  })

  return (
    <group ref={ref} position={[0, 0, -50]}>
      {/* Cave arch */}
      <mesh position={[0, 3, 0]}>
        <torusGeometry args={[4, 2.5, 8, 12, Math.PI]} />
        <meshStandardMaterial color={0x3e2723} roughness={1} />
      </mesh>
      {/* Dark interior */}
      <mesh position={[0, 2, -1]}>
        <planeGeometry args={[8, 5]} />
        <meshBasicMaterial color={0x050505} />
      </mesh>
      {/* Glow hint */}
      <pointLight position={[0, 3, -3]} color={0xffd700} intensity={2} distance={10} />
      {/* Sign */}
      <mesh position={[0, 7, 0]}>
        <boxGeometry args={[3, 1.5, 0.1]} />
        <meshStandardMaterial color={0x5d4037} />
      </mesh>
      {/* Proximity trigger */}
      <ProximityTrigger position={[0, 0, 2]} radius={8} onEnter={() => advanceScene()} />
    </group>
  )
}

function ProximityTrigger({
  position,
  radius,
  onEnter,
}: {
  position: [number, number, number]
  radius: number
  onEnter: () => void
}) {
  const triggered = useRef(false)

  useFrame(({ camera }) => {
    if (triggered.current) return
    const dist = camera.position.distanceTo(new THREE.Vector3(...position))
    if (dist < radius) {
      triggered.current = true
      onEnter()
    }
  })

  return null
}

function CaveRocks() {
  return (
    <group position={[0, 0, -50]}>
      {/* Rock walls around cave */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2
        const r = 8 + Math.random() * 4
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * r, Math.random() * 3, Math.sin(angle) * r - 3]}
          >
            <dodecahedronGeometry args={[2 + Math.random() * 2, 0]} />
            <meshStandardMaterial color={0x4e342e} roughness={1} />
          </mesh>
        )
      })}
    </group>
  )
}

export default function PeachForestScene() {
  return (
    <div className="w-full h-full relative">
      <Canvas
        shadows
        camera={{ position: [0, 1.5, 10], fov: 70, near: 0.1, far: 500 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#1a2030']} />
        <fog attach="fog" args={['#2a1a2a', 15, 80]} />

        {/* Lighting */}
        <ambientLight intensity={0.4} color={0xffd4a6} />
        <directionalLight
          position={[30, 40, 20]}
          intensity={1.2}
          color={0xfff0e0}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={100}
          shadow-camera-left={-60}
          shadow-camera-right={60}
          shadow-camera-top={60}
          shadow-camera-bottom={-60}
        />
        <hemisphereLight args={[0xffe4c4, 0x2d5a27, 0.3]} />

        <Suspense fallback={null}>
          <Terrain />
          <Water />
          <ProceduralTrees />
          <PetalParticles />
          <CaveEntrance />
          <CaveRocks />
        </Suspense>

        <PlayerController />
      </Canvas>

      {/* HUD overlay */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none z-10">
        <p className="text-sm opacity-40" style={{ color: '#d4c5a9', letterSpacing: '0.15em' }}>
          WASD 移动 · 鼠标环顾 · Shift 奔跑
        </p>
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none z-10">
        <p className="text-xs opacity-30" style={{ color: '#d4c5a9' }}>
          探索桃花林，寻找山洞入口…
        </p>
      </div>
    </div>
  )
}
