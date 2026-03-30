import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Suspense, useRef, useState, useEffect, useCallback } from 'react'
import { PlayerController, MobileControls } from '../../engine/PlayerController'
import { ProceduralTrees } from '../world/ProceduralTrees'
import { PetalParticles } from '../world/PetalParticles'
import { Terrain } from '../world/Terrain'
import { Water } from '../world/Water'
import { DayNightCycle } from '../world/DayNightCycle'
import { InkWashEffect } from '../world/InkWashEffect'
import { useAudio } from '../../engine/AudioManager'
import { advanceScene } from '../../engine/SceneManager'
import * as THREE from 'three'

export function SkyDome() {
  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[200, 32, 32]} />
      <shaderMaterial
        side={THREE.BackSide}
        uniforms={{
          topColor: { value: new THREE.Color(0x8899bb) },
          bottomColor: { value: new THREE.Color(0x3d1f2f) },
        }}
        vertexShader={`
          varying vec3 vWorldPosition;
          void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 topColor;
          uniform vec3 bottomColor;
          varying vec3 vWorldPosition;
          void main() {
            float h = normalize(vWorldPosition).y;
            gl_FragColor = vec4(mix(bottomColor, topColor, max(h, 0.0)), 1.0);
          }
        `}
      />
    </mesh>
  )
}

export function GodRay({ position, target }: { position: [number, number, number]; target: [number, number, number] }) {
  const dir = new THREE.Vector3(...target).sub(new THREE.Vector3(...position)).normalize()
  const length = 15
  const end = new THREE.Vector3(...position).add(dir.clone().multiplyScalar(length))
  const mid = new THREE.Vector3(...position).lerp(end, 0.5)
  mid.y += 3

  return (
    <mesh>
      <coneGeometry args={[2.5, length, 8, 1, true]} />
      <meshBasicMaterial
        color={0xffe8c0}
        transparent
        opacity={0.04}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

export function CaveEntrance({ onTrigger }: { onTrigger?: () => void }) {
  const triggerRef = useRef(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const { camera } = useThree()

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === 'KeyE' && triggerRef.current) {
      triggerRef.current = false
      setShowPrompt(false)
      document.exitPointerLock?.()
      if (onTrigger) onTrigger()
      else advanceScene()
    }
  }, [onTrigger])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useFrame(() => {
    const cavePos = new THREE.Vector3(0, 0, -50)
    const dist = camera.position.distanceTo(cavePos)
    if (dist < 12 && !triggerRef.current) {
      triggerRef.current = true
    }
    setShowPrompt(dist < 12)
  })

  return (
    <group position={[0, 0, -50]}>
      {/* Cave arch */}
      <mesh position={[0, 3, 0]} castShadow>
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
      {/* E prompt */}
      {showPrompt && (
        <Html position={[0, 5, 4]} center>
          <div style={{
            color: '#d4c5a9',
            fontSize: '14px',
            letterSpacing: '0.1em',
            textShadow: '0 0 10px rgba(0,0,0,0.8)',
            whiteSpace: 'nowrap',
            opacity: 0.8,
          }}>
            按 E 进入山洞
          </div>
        </Html>
      )}
    </group>
  )
}

export function CaveRocks() {
  return (
    <group position={[0, 0, -50]}>
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2
        const r = 8 + Math.random() * 4
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * r, Math.random() * 3, Math.sin(angle) * r - 3]}
            castShadow
          >
            <dodecahedronGeometry args={[2 + Math.random() * 2, 0]} />
            <meshStandardMaterial color={0x4e342e} roughness={1} />
          </mesh>
        )
      })}
    </group>
  )
}

function Compass() {
  const { camera } = useThree()

  return (
    <Html position={[0, 0, 0]} fullscreen style={{ pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        border: '1px solid rgba(212, 197, 169, 0.3)',
        background: 'rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px',
        color: 'rgba(212, 197, 169, 0.5)',
        letterSpacing: '0.05em',
      }}>
        <CompassArrow camera={camera} />
      </div>
    </Html>
  )
}

function CompassArrow({ camera }: { camera: THREE.Camera }) {
  const ref = useRef<HTMLDivElement>(null)

  useFrame(() => {
    if (!ref.current) return
    // Cave is at z=-50. Calculate angle.
    const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    const toCave = new THREE.Vector3(0, 0, -50).sub(camera.position).normalize()
    const angle = Math.atan2(camDir.x, camDir.z) - Math.atan2(toCave.x, toCave.z)
    ref.current.style.transform = `rotate(${-angle}rad)`
  })

  return (
    <div ref={ref} style={{ position: 'absolute', transition: 'transform 0.1s' }}>
      ↑ 洞
    </div>
  )
}

export default function PeachForestScene() {
  const [locked, setLocked] = useState(false)
  const { startAmbient, stopAll } = useAudio()

  useEffect(() => {
    const onChange = () => setLocked(!!document.pointerLockElement)
    document.addEventListener('pointerlockchange', onChange)
    return () => {
      document.removeEventListener('pointerlockchange', onChange)
      stopAll()
    }
  }, [stopAll])

  // Start ambient audio on first click
  const audioStarted = useRef(false)
  const handleCanvasClick = useCallback(() => {
    if (!audioStarted.current) {
      audioStarted.current = true
      startAmbient('forest')
    }
  }, [startAmbient])

  return (
    <div className="w-full h-full relative">
      <Canvas
        shadows
        camera={{ position: [0, 1.5, 10], fov: 70, near: 0.1, far: 500 }}
        gl={{ antialias: true, alpha: false }}
      >
        <fog attach="fog" args={['#3d1f2f', 10, 60]} />

        {/* Lighting - managed by DayNightCycle */}
        <DayNightCycle speed={0.015} />

        {/* God rays */}
        <GodRay position={[10, 20, -20]} target={[10, 0, -20]} />
        <GodRay position={[-15, 20, -10]} target={[-15, 0, -10]} />
        <GodRay position={[5, 20, -40]} target={[5, 0, -40]} />

        <SkyDome />

        <Suspense fallback={null}>
          <Terrain />
          <Water />
          <ProceduralTrees />
          <PetalParticles />
          <CaveEntrance />
          <CaveRocks />
        </Suspense>

        <PlayerController />
        <Compass />
        <InkWashEffect inkIntensity={1.3} edgeStrength={1.2} paperRoughness={0.35} />
      </Canvas>

      {/* HUD */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none z-10">
        <p className="text-sm opacity-50" style={{ color: '#d4c5a9', letterSpacing: '0.15em' }}>
          🌸 桃花林 · 春
        </p>
      </div>

      {!audioStarted.current && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 pointer-events-none z-10">
          <p className="text-xs opacity-30" style={{ color: '#d4c5a9' }}>
            🔊 点击画面开启音效
          </p>
        </div>
      )}

      {!locked && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="text-center">
            <p className="text-lg mb-2" style={{ color: '#d4c5a9', letterSpacing: '0.1em' }}>
              点击画面开始探索
            </p>
            <p className="text-xs opacity-40" style={{ color: '#d4c5a9' }}>
              WASD 移动 · 鼠标环顾 · Shift 奔跑
            </p>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none z-10">
        <p className="text-xs opacity-30" style={{ color: '#d4c5a9' }}>
          探索桃花林，寻找山洞入口…
        </p>
      </div>

      <MobileControls />
    </div>
  )
}
