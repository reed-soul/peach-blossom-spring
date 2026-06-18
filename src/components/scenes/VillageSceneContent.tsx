import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import type { Story } from 'inkjs'
import { PlayerController, MobileControls } from '../../engine/PlayerController'
import { PhysicsWorld } from '../../engine/PhysicsWorld'
import { DayNightCycle } from '../world/DayNightCycle'
import { InkWashEffect } from '../world/InkWashEffect'
import { VillageTerrain } from '../world/VillageTerrain'
import { PetalParticles } from '../world/PetalParticles'
import { MountainRange } from '../world/MountainRange'
import { SkyDome } from '../world/SkyDome'
import { useAudio } from '../../engine/AudioManager'
import { useGameStore } from '../../store/useGameStore'
import { advanceFromVillage } from '../../engine/navigation'
import {
  createVillageStory,
  interactWithNpc,
  chooseOption,
  readFinalChoice,
  type DialogueStep,
} from '../../narrative/villageStory'

function ChineseHouse({ position, rotation = 0, scale = 1 }: { position: [number, number, number]; rotation?: number; scale?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[4, 3, 3]} />
        <meshStandardMaterial color={0xf5e6d0} roughness={0.9} />
      </mesh>
      <mesh position={[0, 3.8, 0]} castShadow>
        <coneGeometry args={[3.5, 2, 4]} />
        <meshStandardMaterial color={0x2d2d2d} roughness={1} />
      </mesh>
      <mesh position={[0, 1.2, 1.51]}>
        <planeGeometry args={[1, 2.4]} />
        <meshStandardMaterial color={0x5d4037} />
      </mesh>
      <mesh position={[-1.2, 1.8, 1.51]}>
        <planeGeometry args={[0.8, 0.8]} />
        <meshStandardMaterial color={0x1a1a1a} />
      </mesh>
      <mesh position={[1.2, 1.8, 1.51]}>
        <planeGeometry args={[0.8, 0.8]} />
        <meshStandardMaterial color={0x1a1a1a} />
      </mesh>
    </group>
  )
}

function NPC({
  position,
  name,
  onInteract,
}: {
  position: [number, number, number]
  name: string
  onInteract: () => void
}) {
  const ref = useRef<THREE.Group>(null)
  const [inRange, setInRange] = useState(false)
  const { camera } = useThree()

  useFrame(() => {
    if (!ref.current) return
    const dir = new THREE.Vector3().subVectors(camera.position, ref.current.position)
    dir.y = 0
    if (dir.length() > 0.1) {
      ref.current.lookAt(ref.current.position.x + dir.x, ref.current.position.y, ref.current.position.z + dir.z)
    }
    setInRange(camera.position.distanceTo(ref.current.position) < 6)
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'KeyE' && inRange) onInteract()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [inRange, onInteract])

  return (
    <group ref={ref} position={position}>
      <mesh position={[0, 1, 0]} castShadow>
        <capsuleGeometry args={[0.3, 1, 4, 8]} />
        <meshStandardMaterial color={0x4a6741} />
      </mesh>
      <mesh position={[0, 2, 0]} castShadow>
        <sphereGeometry args={[0.35, 8, 8]} />
        <meshStandardMaterial color={0xffdab9} />
      </mesh>
      <mesh position={[0, 2.4, 0]}>
        <cylinderGeometry args={[0.5, 0.2, 0.3, 8]} />
        <meshStandardMaterial color={0x2d2d2d} />
      </mesh>
      <Html position={[0, 3, 0]} center>
        <div style={{
          color: '#d4c5a9', fontSize: '13px', letterSpacing: '0.1em',
          textShadow: '0 0 8px rgba(0,0,0,0.9)', whiteSpace: 'nowrap', opacity: 0.8,
        }}>
          {name}
        </div>
      </Html>
      {inRange && (
        <Html position={[0, 3.8, 0]} center>
          <div style={{ color: '#ffd700', fontSize: '12px', textShadow: '0 0 8px rgba(0,0,0,0.9)', whiteSpace: 'nowrap' }}>
            按 E 对话
          </div>
        </Html>
      )}
    </group>
  )
}

function ChineseLantern({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (ref.current) ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.05
  })
  return (
    <group ref={ref} position={position}>
      <mesh>
        <cylinderGeometry args={[0.4, 0.4, 0.8, 8]} />
        <meshStandardMaterial color={0xcc0000} emissive={0x880000} emissiveIntensity={0.3} />
      </mesh>
      <pointLight color={0xffd700} intensity={2} distance={8} />
    </group>
  )
}

function Bridge({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[4, 0.2, 1.5]} />
        <meshStandardMaterial color={0x5d4037} />
      </mesh>
      <mesh position={[-1.8, 0.8, 0]}>
        <boxGeometry args={[0.1, 0.6, 1.5]} />
        <meshStandardMaterial color={0x5d4037} />
      </mesh>
      <mesh position={[1.8, 0.8, 0]}>
        <boxGeometry args={[0.1, 0.6, 1.5]} />
        <meshStandardMaterial color={0x5d4037} />
      </mesh>
    </group>
  )
}

function VillagePeachTrees() {
  const trees = useMemo(() =>
    Array.from({ length: 24 }).map((_, i) => {
      const angle = (i / 24) * Math.PI * 2
      const r = 22 + Math.sin(i * 4.7) * 5
      return {
        x: Math.cos(angle) * r,
        z: Math.sin(angle) * r - 8,
        scale: 0.8 + Math.sin(i * 2.3) * 0.3,
      }
    }),
  [])

  return (
    <>
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} scale={t.scale}>
          <mesh position={[0, 2.5, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.25, 5, 6]} />
            <meshStandardMaterial color={0x5d4037} />
          </mesh>
          <mesh position={[0, 5.5, 0]}>
            <sphereGeometry args={[2, 8, 6]} />
            <meshStandardMaterial color={0xffb7c5} roughness={0.8} />
          </mesh>
        </group>
      ))}
    </>
  )
}

function useTypewriter(text: string, speed = 45) {
  const [displayed, setDisplayed] = useState('')
  useEffect(() => {
    if (!text) { setDisplayed(''); return }
    let i = 0
    setDisplayed('')
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1))
        i++
      } else {
        clearInterval(timer)
      }
    }, speed)
    return () => clearInterval(timer)
  }, [text, speed])
  return displayed
}

function finishDialogue(story: Story, step: DialogueStep) {
  if (step.hasEnding) {
    document.exitPointerLock?.()
    advanceFromVillage()
    return true
  }
  return false
}

export default function VillageSceneContent() {
  const storyRef = useRef<Story | null>(null)
  const [activeNPC, setActiveNPC] = useState<string | null>(null)
  const [dialogue, setDialogue] = useState<DialogueStep | null>(null)
  const [showFinalChoice, setShowFinalChoice] = useState(false)

  const visitedCount = useGameStore((s) => s.storyState.visitedNPCs.length)
  const typedText = useTypewriter(dialogue?.text ?? '')
  const { startAmbient, stopAll } = useAudio()

  useEffect(() => {
    storyRef.current = createVillageStory()
    startAmbient('village')
    return () => stopAll()
  }, [startAmbient, stopAll])

  useEffect(() => {
    if (visitedCount >= 3 && !activeNPC && !dialogue?.choices.length && !showFinalChoice) {
      const t = setTimeout(() => setShowFinalChoice(true), 800)
      return () => clearTimeout(t)
    }
  }, [visitedCount, activeNPC, dialogue, showFinalChoice])

  const handleInteract = useCallback((name: string) => {
    const story = storyRef.current
    if (!story) return
    const step = interactWithNpc(story, name)
    setActiveNPC(name)
    setDialogue(step)
    setShowFinalChoice(false)
  }, [])

  const handleChoice = useCallback((index: number) => {
    const story = storyRef.current
    if (!story) return
    const step = chooseOption(story, index)
    setDialogue(step)
    if (finishDialogue(story, step)) return
    if (step.choices.length > 0) return
    setActiveNPC(null)
  }, [])

  const handleFinalChoice = useCallback(() => {
    const story = storyRef.current
    if (!story) return
    const step = readFinalChoice(story)
    setDialogue(step)
    setShowFinalChoice(false)
    setActiveNPC(null)
  }, [])

  useEffect(() => {
    if (showFinalChoice) handleFinalChoice()
  }, [showFinalChoice, handleFinalChoice])

  const closeDialogue = () => {
    if (dialogue?.choices.length) return
    setActiveNPC(null)
    setDialogue(null)
  }

  const housePositions: [number, number, number][] = [
    [-10, 0, -5], [8, 0, -8], [-5, 0, -20], [12, 0, -15], [0, 0, -25],
  ]

  return (
    <div className="w-full h-full relative">
      <Canvas shadows camera={{ position: [0, 1.5, 15], fov: 70, near: 0.1, far: 300 }}>
        <PhysicsWorld gravity={[0, -9.81, 0]}>
          <fog attach="fog" args={['#c5d8e8', 20, 100]} />
          <DayNightCycle speed={0.012} />
          <SkyDome />

          <RigidBody type="fixed" friction={0.8}>
            <CuboidCollider args={[50, 0.05, 50]} position={[0, -0.05, 0]} />
          </RigidBody>

          <RigidBody type="fixed">
            <CuboidCollider args={[50, 10, 0.5]} position={[0, 5, -55]} />
            <CuboidCollider args={[50, 10, 0.5]} position={[0, 5, 55]} />
            <CuboidCollider args={[0.5, 10, 50]} position={[-55, 5, 0]} />
            <CuboidCollider args={[0.5, 10, 50]} position={[55, 5, 0]} />
          </RigidBody>

          {housePositions.map((pos, i) => (
            <RigidBody key={`hc${i}`} type="fixed" position={[pos[0], 1.5, pos[2]]}>
              <CuboidCollider args={[2.5, 2, 2]} />
            </RigidBody>
          ))}

          <VillageTerrain />
          <MountainRange />
          <VillagePeachTrees />
          <PetalParticles />

          <ChineseHouse position={[-10, 0, -5]} rotation={0.3} />
          <ChineseHouse position={[8, 0, -8]} rotation={-0.2} scale={1.2} />
          <ChineseHouse position={[-5, 0, -20]} rotation={0.5} scale={0.9} />
          <ChineseHouse position={[12, 0, -15]} rotation={-0.4} scale={1.1} />
          <ChineseHouse position={[0, 0, -25]} rotation={0} scale={1.3} />

          <NPC position={[0, 0, -2]} name="老翁" onInteract={() => handleInteract('老翁')} />
          <NPC position={[-6, 0, -10]} name="渔女" onInteract={() => handleInteract('渔女')} />
          <NPC position={[5, 0, -12]} name="书生" onInteract={() => handleInteract('书生')} />
          <NPC position={[-3, 0, -18]} name="童子" onInteract={() => handleInteract('童子')} />

          <ChineseLantern position={[-9, 4, -4]} />
          <ChineseLantern position={[9, 4, -7]} />
          <ChineseLantern position={[0, 4, -24]} />

          <Bridge position={[3, 0, -8]} />

          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -8]}>
            <circleGeometry args={[6, 32]} />
            <meshStandardMaterial color={0x2e8b8b} transparent opacity={0.55} roughness={0.1} metalness={0.2} />
          </mesh>

          <PlayerController position={[0, 3, 15]} />
          <InkWashEffect inkIntensity={1.0} edgeStrength={1.0} paperRoughness={0.25} />
        </PhysicsWorld>
      </Canvas>

      {activeNPC && typedText && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20" onClick={closeDialogue}>
          <div
            className="px-8 py-4 rounded-sm max-w-md text-center cursor-pointer"
            style={{
              backgroundColor: 'rgba(26, 15, 10, 0.92)',
              border: '1px solid #5d4037',
              color: '#d4c5a9',
              letterSpacing: '0.05em',
              fontSize: '1.1rem',
            }}
          >
            <p className="text-xs mb-2 opacity-50">{activeNPC}</p>
            <p>{typedText}<span className="animate-pulse">▌</span></p>
            {!dialogue?.choices.length && (
              <p className="text-xs mt-3 opacity-30">点击关闭</p>
            )}
          </div>
        </div>
      )}

      {dialogue && dialogue.choices.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/40">
          <div className="text-center p-6 rounded-sm max-w-md" style={{
            backgroundColor: 'rgba(26, 15, 10, 0.95)',
            border: '1px solid #5d4037',
          }}>
            {typedText && (
              <p className="text-lg mb-4" style={{ color: '#d4c5a9', letterSpacing: '0.1em' }}>
                {typedText}
              </p>
            )}
            <div className="flex flex-col gap-3">
              {dialogue.choices.map((c) => (
                <button
                  key={c.index}
                  onClick={() => handleChoice(c.index)}
                  className="px-5 py-2 rounded-sm border cursor-pointer transition-all hover:scale-105"
                  style={{ borderColor: '#5d4037', color: '#d4c5a9', backgroundColor: 'rgba(93, 64, 55, 0.2)' }}
                >
                  {c.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none z-10">
        <p className="text-sm opacity-50" style={{ color: '#d4c5a9', letterSpacing: '0.15em' }}>
          🏡 桃源村 · 土地平旷，屋舍俨然
        </p>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none z-10">
        <p className="text-xs opacity-30" style={{ color: '#d4c5a9' }}>
          {visitedCount < 3
            ? `已与 ${visitedCount}/3 位村民交谈`
            : '你已了解此地，做出你的选择吧'}
        </p>
      </div>

      <MobileControls />
    </div>
  )
}
