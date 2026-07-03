import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { Suspense, useRef, useState, useEffect, useCallback } from 'react'
import { PlayerController, MobileControls } from '../../engine/PlayerController'
import { PhysicsWorld } from '../../engine/PhysicsWorld'
import { ProceduralTrees, GroundCover, Rocks } from '../world/ProceduralTrees'
import { PetalParticles } from '../world/PetalParticles'
import { Terrain } from '../world/Terrain'
import { Stream } from '../world/Stream'
import { MountainRange } from '../world/MountainRange'
import { DayNightCycle } from '../world/DayNightCycle'
import { InkWashEffect } from '../world/InkWashEffect'
import { SkyDome, GodRay } from '../world/SkyDome'
import { CaveEntrance, CAVE_WORLD_Z } from '../world/CaveEntrance'
import { useAudio } from '../../engine/AudioManager'
import { advanceScene } from '../../engine/navigation'
import { ForestDetails } from '../../cinematic/world/ForestDetails'
import { NarrativeCaption } from '../ui/NarrativeCaption'
import * as THREE from 'three'

export function CaveRocks() {
  const rockData = useRef(
    Array.from({ length: 12 }).map((_, i) => {
      const angle = (i / 12) * Math.PI * 2
      const r = 8 + Math.sin(i * 7.3) * 3 + 2
      const scale = 2 + Math.sin(i * 3.7) * 1.5
      return {
        x: Math.cos(angle) * r,
        y: Math.sin(i * 5.1) * 2,
        z: Math.sin(angle) * r - 3,
        scale,
      }
    }),
  )

  return (
    <group position={[0, 0, CAVE_WORLD_Z]}>
      {rockData.current.map((rock, i) => (
        <mesh key={i} position={[rock.x, rock.y, rock.z]} castShadow>
          <dodecahedronGeometry args={[rock.scale, 0]} />
          <meshStandardMaterial color={0x4e342e} roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

function CaveRockColliders() {
  const rockData = useRef(
    Array.from({ length: 12 }).map((_, i) => {
      const angle = (i / 12) * Math.PI * 2
      const r = 8 + Math.sin(i * 7.3) * 3 + 2
      const scale = 2 + Math.sin(i * 3.7) * 1.5
      return {
        x: Math.cos(angle) * r,
        y: Math.sin(i * 5.1) * 2,
        z: Math.sin(angle) * r - 3,
        scale,
      }
    }),
  )

  return (
    <group position={[0, 0, CAVE_WORLD_Z]}>
      {rockData.current.map((rock, i) => (
        <RigidBody key={i} type="fixed" position={[rock.x, rock.y, rock.z]}>
          <CuboidCollider args={[rock.scale * 0.7, rock.scale * 0.7, rock.scale * 0.7]} />
        </RigidBody>
      ))}
    </group>
  )
}

function ForestCaptionWatcher({ onCaption }: { onCaption: (text: string) => void }) {
  const shown = useRef(new Set<string>())
  const { camera } = useThree()

  useFrame(() => {
    const z = camera.position.z
    if (z < -38 && !shown.current.has('mountain')) {
      shown.current.add('mountain')
      onCaption('林尽水源，便得一山。')
    }
    if (z < -52 && !shown.current.has('cave')) {
      shown.current.add('cave')
      onCaption('山有小口，仿佛若有光。')
    }
  })

  return null
}

function Compass() {
  const { camera } = useThree()

  return (
    <Html position={[0, 0, 0]} fullscreen style={{ pointerEvents: 'none' }}>
      <div
        style={{
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
        }}
      >
        <CompassArrow camera={camera} />
      </div>
    </Html>
  )
}

function CompassArrow({ camera }: { camera: THREE.Camera }) {
  const ref = useRef<HTMLDivElement>(null)

  useFrame(() => {
    if (!ref.current) return
    const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    const toCave = new THREE.Vector3(0, 0, CAVE_WORLD_Z).sub(camera.position).normalize()
    const angle = Math.atan2(camDir.x, camDir.z) - Math.atan2(toCave.x, toCave.z)
    ref.current.style.transform = `rotate(${-angle}rad)`
  })

  return (
    <div ref={ref} style={{ position: 'absolute', transition: 'transform 0.1s' }}>
      ↑ 洞
    </div>
  )
}

export default function PeachForestSceneContent() {
  const [locked, setLocked] = useState(false)
  const [caption, setCaption] = useState('')
  const [captionVisible, setCaptionVisible] = useState(false)
  const { startAmbient, stopAll } = useAudio()

  const showCaption = useCallback((text: string) => {
    setCaption(text)
    setCaptionVisible(true)
  }, [])

  useEffect(() => {
    const onChange = () => setLocked(!!document.pointerLockElement)
    document.addEventListener('pointerlockchange', onChange)
    return () => {
      document.removeEventListener('pointerlockchange', onChange)
      stopAll()
    }
  }, [stopAll])

  const audioStarted = useRef(false)
  const handleCanvasClick = useCallback(() => {
    if (!audioStarted.current) {
      audioStarted.current = true
      startAmbient('forest')
    }
  }, [startAmbient])

  return (
    <div className="w-full h-full relative" onClick={handleCanvasClick}>
      <Canvas
        shadows
        camera={{ position: [0, 1.5, 10], fov: 70, near: 0.1, far: 500 }}
        gl={{ antialias: true, alpha: false }}
      >
        <PhysicsWorld gravity={[0, -9.81, 0]}>
          <fog attach="fog" args={['#c5d0d8', 15, 90]} />

          <DayNightCycle speed={0.015} />

          <GodRay position={[10, 20, -20]} target={[10, 0, -20]} />
          <GodRay position={[-15, 20, -10]} target={[-15, 0, -10]} />
          <GodRay position={[5, 20, -40]} target={[5, 0, -40]} />
          <GodRay position={[0, 18, -55]} target={[0, 0, CAVE_WORLD_Z]} />

          <SkyDome />

          <RigidBody type="fixed" friction={0.8}>
            <CuboidCollider args={[100, 0.05, 100]} position={[0, -0.05, 0]} />
          </RigidBody>

          <RigidBody type="fixed">
            <CuboidCollider args={[100, 10, 0.5]} position={[0, 5, -80]} />
            <CuboidCollider args={[100, 10, 0.5]} position={[0, 5, 65]} />
            <CuboidCollider args={[0.5, 10, 100]} position={[-65, 5, 0]} />
            <CuboidCollider args={[0.5, 10, 100]} position={[65, 5, 0]} />
          </RigidBody>

          <CaveRockColliders />

          <Suspense fallback={null}>
            <Terrain />
            <Stream />
            <MountainRange />
            <ProceduralTrees />
            <GroundCover />
            <Rocks />
            <PetalParticles />
            <ForestDetails />
            <CaveEntrance onTrigger={() => advanceScene()} />
            <CaveRocks />
          </Suspense>

          <ForestCaptionWatcher onCaption={showCaption} />
          <PlayerController position={[0, 3, 10]} />
        </PhysicsWorld>
        <Compass />
        <InkWashEffect inkIntensity={1.3} edgeStrength={1.2} paperRoughness={0.35} />
      </Canvas>

      <NarrativeCaption text={caption} visible={captionVisible} />

      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none z-10">
        <p className="text-sm opacity-50" style={{ color: '#d4c5a9', letterSpacing: '0.15em' }}>
          🌸 桃花林 · 夹岸数百步
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
          沿溪前行，寻找林尽处的山洞…
        </p>
      </div>

      <MobileControls />
    </div>
  )
}
