import { useRef, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
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
import {
  ChineseHouse,
  ChineseLantern,
  VillageBridge,
  VillagePeachTrees,
  VillageNpc,
  VillageDetails,
} from '../world/village'

function useTypewriter(text: string, speed = 45) {
  const [displayed, setDisplayed] = useState('')
  useEffect(() => {
    if (!text) {
      setDisplayed('')
      return
    }
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

function finishDialogue(step: DialogueStep) {
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

  const completedCount = useGameStore((s) => s.storyState.completedArcs.length)
  const typedText = useTypewriter(dialogue?.text ?? '')
  const { startAmbient, stopAll } = useAudio()

  useEffect(() => {
    storyRef.current = createVillageStory()
    startAmbient('village')
    return () => stopAll()
  }, [startAmbient, stopAll])

  useEffect(() => {
    if (completedCount >= 3 && !activeNPC && !dialogue?.choices.length && !showFinalChoice) {
      const t = setTimeout(() => setShowFinalChoice(true), 800)
      return () => clearTimeout(t)
    }
  }, [completedCount, activeNPC, dialogue, showFinalChoice])

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
    if (finishDialogue(step)) return
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
          <fog attach="fog" args={['#f0ebe0', 25, 110]} />
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
          <group position={[0, 0, 70]}>
            <VillageDetails />
          </group>
          <PetalParticles />

          <ChineseHouse position={[-10, 0, -5]} rotation={0.3} />
          <ChineseHouse position={[8, 0, -8]} rotation={-0.2} scale={1.2} />
          <ChineseHouse position={[-5, 0, -20]} rotation={0.5} scale={0.9} />
          <ChineseHouse position={[12, 0, -15]} rotation={-0.4} scale={1.1} />
          <ChineseHouse position={[0, 0, -25]} rotation={0} scale={1.3} />

          <VillageNpc position={[0, 0, -2]} name="老翁" isTalking={activeNPC === '老翁'} onInteract={() => handleInteract('老翁')} />
          <VillageNpc position={[-6, 0, -10]} name="渔女" isTalking={activeNPC === '渔女'} onInteract={() => handleInteract('渔女')} />
          <VillageNpc position={[5, 0, -12]} name="书生" isTalking={activeNPC === '书生'} onInteract={() => handleInteract('书生')} />
          <VillageNpc position={[-3, 0, -18]} name="童子" isTalking={activeNPC === '童子'} onInteract={() => handleInteract('童子')} />

          <ChineseLantern position={[-9, 4, -4]} />
          <ChineseLantern position={[9, 4, -7]} />
          <ChineseLantern position={[0, 4, -24]} />

          <VillageBridge position={[3, 0, -8]} />

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
            <p>
              {typedText}
              <span className="animate-pulse">▌</span>
            </p>
            {!dialogue?.choices.length && <p className="text-xs mt-3 opacity-30">点击关闭</p>}
          </div>
        </div>
      )}

      {dialogue && dialogue.choices.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/40">
          <div
            className="text-center p-6 rounded-sm max-w-md"
            style={{
              backgroundColor: 'rgba(26, 15, 10, 0.95)',
              border: '1px solid #5d4037',
            }}
          >
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
          {completedCount < 3
            ? `已了解 ${completedCount}/3 位村民的故事`
            : '你已倾听足够多的故事，做出你的抉择吧'}
        </p>
      </div>

      <MobileControls />
    </div>
  )
}
