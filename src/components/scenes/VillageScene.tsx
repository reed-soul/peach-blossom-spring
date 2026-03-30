import { useRef, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { PlayerController, MobileControls } from '../../engine/PlayerController'
import { DayNightCycle } from '../world/DayNightCycle'
import { InkWashEffect } from '../world/InkWashEffect'
import { useAudio } from '../../engine/AudioManager'
import { useGameStore } from '../../store/useGameStore'
import { advanceScene } from '../../engine/SceneManager'

function ChineseHouse({ position, rotation = 0, scale = 1 }: { position: [number, number, number]; rotation?: number; scale?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[4, 3, 3]} />
        <meshStandardMaterial color={0xf5e6d0} roughness={0.9} />
      </mesh>
      {/* Curved roof */}
      <mesh position={[0, 3.8, 0]} castShadow>
        <coneGeometry args={[3.5, 2, 4]} />
        <meshStandardMaterial color={0x2d2d2d} roughness={1} />
      </mesh>
      {/* Door */}
      <mesh position={[0, 1.2, 1.51]}>
        <planeGeometry args={[1, 2.4]} />
        <meshStandardMaterial color={0x5d4037} />
      </mesh>
      {/* Windows */}
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
  dialogue,
  onInteract,
}: {
  position: [number, number, number]
  name: string
  dialogue: string | null
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
    const dist = camera.position.distanceTo(ref.current.position)
    setInRange(dist < 6)
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
      {/* Name label */}
      <Html position={[0, 3, 0]} center>
        <div style={{
          color: '#d4c5a9',
          fontSize: '13px',
          letterSpacing: '0.1em',
          textShadow: '0 0 8px rgba(0,0,0,0.9)',
          whiteSpace: 'nowrap',
          opacity: 0.8,
        }}>
          {name}
        </div>
      </Html>
      {/* Interaction prompt */}
      {inRange && (
        <Html position={[0, 3.8, 0]} center>
          <div style={{
            color: '#ffd700',
            fontSize: '12px',
            textShadow: '0 0 8px rgba(0,0,0,0.9)',
            whiteSpace: 'nowrap',
            animation: 'pulse 1.5s infinite',
          }}>
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
    if (!ref.current) return
    ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.05
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

function useTypewriter(text: string | null, speed = 50) {
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

export default function VillageScene() {
  const [activeNPC, setActiveNPC] = useState<string | null>(null)
  const [dialogues, setDialogues] = useState<Record<string, string[]>>({})
  const [showChoice, setShowChoice] = useState<string | null>(null)

  const npcData: Record<string, { lines: string[]; choice?: { a: string; b: string; aLabel: string; bLabel: string } }> = {
    '老翁': {
      lines: ['老夫在此隐居数十载，不知今夕何年。', '年轻人，你从何而来？可曾见过外面的世界？', '此地无忧无虑，你可愿留下？'],
      choice: { a: 'stay', b: 'return', aLabel: '我愿留下', bLabel: '我思念家乡' },
    },
    '渔女': {
      lines: ['小女子每日在此织网捕鱼，日子清闲得很。', '你可知道，这桃花林外头，已过了多少年月？', '留下来吧，这里没有纷争。'],
      choice: { a: 'stay', b: 'return', aLabel: '这里真好', bLabel: '外面的世界也在等我' },
    },
    '书生': {
      lines: ['我本是读书人，因避战乱来到此地。', '这里典籍虽少，但内心安宁。', '所谓世外桃源，不过是人心所向罢了。'],
      choice: { a: 'stay', b: 'return', aLabel: '说得有理', bLabel: '天下未定，我不能独善' },
    },
    '童子': {
      lines: ['哥哥姐姐，你从哪里来的呀？', '这里好玩的！有很多桃子可以吃！', '你怎么不进来坐坐呢？'],
    },
  }

  const handleInteract = useCallback((name: string) => {
    const data = npcData[name]
    if (!data) return
    const idx = (dialogues[name]?.length || 0) % data.lines.length
    const line = data.lines[idx]
    setActiveNPC(name)
    setDialogues(prev => ({ ...prev, [name]: [...(prev[name] || []), line] }))

    // Show choice after 3rd dialogue for NPCs that have choices
    if (idx === 2 && data.choice) {
      setTimeout(() => setShowChoice(name), line.length * 50 + 500)
    }
  }, [dialogues, npcData])

  const handleChoice = useCallback((choice: string) => {
    setShowChoice(null)
    useGameStore.getState().setEnding(choice)
    useGameStore.getState().addChoice(choice)
    document.exitPointerLock?.()
    advanceScene()
  }, [])

  const currentDialogue = activeNPC ? npcData[activeNPC]?.lines[(dialogues[activeNPC]?.length || 0) - 1] ?? null : null
  const typedText = useTypewriter(currentDialogue)

  const visitedNPCs = Object.keys(dialogues)
  const visitNPC = useGameStore((s) => s.visitNPC)
  const [showEndingChoice, setShowEndingChoice] = useState(false)
  const { startAmbient, stopAll } = useAudio()
  const audioStarted = useRef(false)

  useEffect(() => {
    if (!audioStarted.current) {
      audioStarted.current = true
      startAmbient('village')
    }
    return () => stopAll()
  }, [startAmbient, stopAll])

  useEffect(() => {
    visitedNPCs.forEach(name => visitNPC(name))
  }, [visitedNPCs, visitNPC])

  // Auto show ending choice after visiting 3+ NPCs and closing dialogue
  useEffect(() => {
    if (visitedNPCs.length >= 3 && !activeNPC && !showChoice) {
      const t = setTimeout(() => setShowEndingChoice(true), 500)
      return () => clearTimeout(t)
    }
  }, [visitedNPCs.length, activeNPC, showChoice])

  return (
    <div className="w-full h-full relative">
      <Canvas
        shadows
        camera={{ position: [0, 1.5, 15], fov: 70, near: 0.1, far: 300 }}
      >
        <Physics gravity={[0, -9.81, 0]}>
        <color attach="background" args={['#87CEEB']} />
        <fog attach="fog" args={['#c5d8e8', 20, 100]} />

        <DayNightCycle speed={0.015} />

        {/* Ground */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color={0x4a7c59} roughness={0.95} />
        </mesh>

        {/* Ground collider */}
        <RigidBody type="fixed" friction={0.8}>
          <CuboidCollider args={[100, 0.05, 100]} position={[0, -0.05, 0]} />
        </RigidBody>

        {/* House colliders */}
        {[
          [-10, 1.5, -5], [8, 1.5, -8], [-5, 1.5, -20], [12, 1.5, -15], [0, 1.5, -25],
        ].map((pos, i) => (
          <RigidBody key={`hc${i}`} type="fixed" position={pos as any}>
            <CuboidCollider args={[2.5, 2, 2]} />
          </RigidBody>
        ))}

        {/* Boundary walls */}
        <RigidBody type="fixed">
          <CuboidCollider args={[100, 10, 0.5]} position={[0, 5, -65]} />
          <CuboidCollider args={[100, 10, 0.5]} position={[0, 5, 65]} />
          <CuboidCollider args={[0.5, 10, 100]} position={[-65, 5, 0]} />
          <CuboidCollider args={[0.5, 10, 100]} position={[65, 5, 0]} />
        </RigidBody>

        {/* Village houses */}
        <ChineseHouse position={[-10, 0, -5]} rotation={0.3} />
        <ChineseHouse position={[8, 0, -8]} rotation={-0.2} scale={1.2} />
        <ChineseHouse position={[-5, 0, -20]} rotation={0.5} scale={0.9} />
        <ChineseHouse position={[12, 0, -15]} rotation={-0.4} scale={1.1} />
        <ChineseHouse position={[0, 0, -25]} rotation={0} scale={1.3} />

        {/* NPCs */}
        <NPC position={[0, 0, -2]} name="老翁" dialogue={typedText} onInteract={() => handleInteract('老翁')} />
        <NPC position={[-6, 0, -10]} name="渔女" dialogue={typedText} onInteract={() => handleInteract('渔女')} />
        <NPC position={[5, 0, -12]} name="书生" dialogue={typedText} onInteract={() => handleInteract('书生')} />
        <NPC position={[-3, 0, -18]} name="童子" dialogue={typedText} onInteract={() => handleInteract('童子')} />

        {/* Lanterns */}
        <ChineseLantern position={[-9, 4, -4]} />
        <ChineseLantern position={[9, 4, -7]} />
        <ChineseLantern position={[0, 4, -24]} />
        <ChineseLantern position={[-4, 4, -19]} />

        {/* Bridge */}
        <Bridge position={[3, 0, -8]} />

        {/* Pond */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[15, 0.05, -5]}>
          <circleGeometry args={[6, 32]} />
          <meshStandardMaterial color={0x2e8b8b} transparent opacity={0.5} roughness={0.1} />
        </mesh>

        {/* Peach trees around village */}
        {Array.from({ length: 30 }).map((_, i) => {
          const angle = (i / 30) * Math.PI * 2
          const r = 25 + Math.sin(i * 4.7) * 7 + 7
          return (
            <group key={i} position={[Math.cos(angle) * r, 0, Math.sin(angle) * r - 10]}>
              <mesh position={[0, 2.5, 0]} castShadow>
                <cylinderGeometry args={[0.15, 0.25, 5, 6]} />
                <meshStandardMaterial color={0x5d4037} />
              </mesh>
              <mesh position={[0, 5.5, 0]}>
                <sphereGeometry args={[2, 8, 6]} />
                <meshStandardMaterial color={0xffb7c5} roughness={0.8} />
              </mesh>
            </group>
          )
        })}

        <PlayerController position={[0, 3, 15]} />

        {/* Ink wash post-processing */}
        <InkWashEffect inkIntensity={1.0} edgeStrength={1.0} paperRoughness={0.25} />
        </Physics>
      </Canvas>

      {/* Dialogue overlay */}
      {activeNPC && typedText && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20" onClick={() => setActiveNPC(null)}>
          <div
            className="px-8 py-4 rounded-sm max-w-md text-center cursor-pointer"
            style={{
              backgroundColor: 'rgba(26, 15, 10, 0.92)',
              border: '1px solid #5d4037',
              color: '#d4c5a9',
              letterSpacing: '0.05em',
              fontSize: '1.1rem',
              backdropFilter: 'blur(4px)',
            }}
          >
            <p className="text-xs mb-2 opacity-50">{activeNPC}</p>
            <p>{typedText}<span className="animate-pulse">▌</span></p>
            <p className="text-xs mt-3 opacity-30">点击关闭</p>
          </div>
        </div>
      )}

      {/* NPC choice */}
      {showChoice && npcData[showChoice]?.choice && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/40">
          <div className="text-center p-6 rounded-sm max-w-md" style={{
            backgroundColor: 'rgba(26, 15, 10, 0.95)',
            border: '1px solid #5d4037',
          }}>
            <p className="text-lg mb-4" style={{ color: '#d4c5a9', letterSpacing: '0.1em' }}>
              {npcData[showChoice]!.lines[2]}
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => handleChoice(npcData[showChoice]!.choice!.a)}
                className="px-5 py-2 rounded-sm border cursor-pointer transition-all hover:scale-105"
                style={{ borderColor: '#5d4037', color: '#d4c5a9', backgroundColor: 'rgba(93, 64, 55, 0.2)' }}
              >
                {npcData[showChoice]!.choice!.aLabel}
              </button>
              <button
                onClick={() => handleChoice(npcData[showChoice]!.choice!.b)}
                className="px-5 py-2 rounded-sm border cursor-pointer transition-all hover:scale-105"
                style={{ borderColor: '#5d4037', color: '#d4c5a9', backgroundColor: 'rgba(93, 64, 55, 0.2)' }}
              >
                {npcData[showChoice]!.choice!.bLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global ending choice after 3 NPCs */}
      {showEndingChoice && !activeNPC && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/50">
          <div className="text-center p-8 rounded-sm max-w-lg" style={{ backgroundColor: 'rgba(26, 15, 10, 0.95)', border: '1px solid #5d4037' }}>
            <p className="text-2xl mb-6" style={{ color: '#d4c5a9', letterSpacing: '0.1em' }}>
              你已与桃源中人交谈，是时候做出选择了
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => handleChoice('return')}
                className="px-6 py-3 rounded-sm border cursor-pointer transition-all hover:scale-105"
                style={{ borderColor: '#5d4037', color: '#d4c5a9', backgroundColor: 'rgba(93, 64, 55, 0.2)' }}
              >
                回归尘世
              </button>
              <button
                onClick={() => handleChoice('stay')}
                className="px-6 py-3 rounded-sm border cursor-pointer transition-all hover:scale-105"
                style={{ borderColor: '#5d4037', color: '#d4c5a9', backgroundColor: 'rgba(93, 64, 55, 0.2)' }}
              >
                留在桃源
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none z-10">
        <p className="text-sm opacity-40" style={{ color: '#333', letterSpacing: '0.15em' }}>
          {'ontouchstart' in window ? '摇杆移动 · 按互动与村民对话' : 'WASD 移动 · 按 E 与村民对话'}
        </p>
      </div>

      <MobileControls />
    </div>
  )
}
