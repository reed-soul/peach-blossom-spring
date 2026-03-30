import { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PlayerController } from '../../engine/PlayerController'
import { useGameStore } from '../../store/useGameStore'
import { advanceScene } from '../../engine/SceneManager'

function ChineseHouse({ position, rotation = 0, scale = 1 }: { position: [number, number, number]; rotation?: number; scale?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      {/* Walls */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[4, 3, 3]} />
        <meshStandardMaterial color={0xf5e6d0} roughness={0.9} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 3.5, 0]} castShadow>
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
  onClick,
}: {
  position: [number, number, number]
  name: string
  onClick: () => void
}) {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ camera }) => {
    if (!ref.current) return
    // Look at player
    const dir = new THREE.Vector3().subVectors(camera.position, ref.current.position)
    dir.y = 0
    if (dir.length() > 0.1) {
      ref.current.lookAt(ref.current.position.x + dir.x, ref.current.position.y, ref.current.position.z + dir.z)
    }
  })

  return (
    <group ref={ref} position={position} onClick={onClick}>
      {/* Body */}
      <mesh position={[0, 1, 0]} castShadow>
        <capsuleGeometry args={[0.3, 1, 4, 8]} />
        <meshStandardMaterial color={0x4a6741} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 2, 0]} castShadow>
        <sphereGeometry args={[0.35, 8, 8]} />
        <meshStandardMaterial color={0xffdab9} />
      </mesh>
      {/* Hat */}
      <mesh position={[0, 2.4, 0]}>
        <cylinderGeometry args={[0.5, 0.2, 0.3, 8]} />
        <meshStandardMaterial color={0x2d2d2d} />
      </mesh>
      {/* Name label - billboard */}
      <sprite position={[0, 3, 0]} scale={[3, 0.6, 1]}>
        <spriteMaterial color={0xd4c5a9} transparent opacity={0.8} />
      </sprite>
      {/* Floating name using a plane facing camera */}
      <NameLabel name={name} position={[0, 3, 0]} />
    </group>
  )
}

function NameLabel({ name, position }: { name: string; position: [number, number, number] }) {
  // We'll render name in HTML overlay instead for better text quality
  return null
}

function ChineseLantern({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!ref.current) return
    ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.05
  })

  return (
    <group ref={ref} position={position}>
      {/* Lantern body */}
      <mesh>
        <cylinderGeometry args={[0.4, 0.4, 0.8, 8]} />
        <meshStandardMaterial color={0xcc0000} emissive={0x880000} emissiveIntensity={0.3} />
      </mesh>
      {/* Light */}
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
      {/* Rails */}
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

export default function VillageScene() {
  const [dialogue, setDialogue] = useState<string | null>(null)
  const [dialogues, setDialogues] = useState<Record<string, string[]>>({})

  const npcDialogues: Record<string, string[]> = {
    '老翁': ['老夫在此隐居数十载，不知今夕何年。', '年轻人，你从何而来？可曾见过外面的世界？', '此地无忧无虑，你可愿留下？'],
    '渔女': ['小女子每日在此织网捕鱼，日子清闲得很。', '你可知道，这桃花林外头，已过了多少年月？', '留下来吧，这里没有纷争。'],
    '书生': ['我本是读书人，因避战乱来到此地。', '这里典籍虽少，但内心安宁。', '所谓世外桃源，不过是人心所向罢了。'],
    '童子': ['哥哥姐姐，你从哪里来的呀？', '这里好玩的！有很多桃子可以吃！', '你怎么不进来坐坐呢？'],
  }

  const handleNPCClick = (name: string) => {
    const lines = npcDialogues[name]
    if (!lines) return
    const nextIdx = (dialogues[name]?.length || 0) % lines.length
    setDialogues((prev) => ({ ...prev, [name]: [...(prev[name] || []), lines[nextIdx]] }))
    setDialogue(lines[nextIdx])
  }

  return (
    <div className="w-full h-full relative">
      <Canvas
        shadows
        camera={{ position: [0, 1.5, 15], fov: 70, near: 0.1, far: 300 }}
      >
        <color attach="background" args={['#87CEEB']} />
        <fog attach="fog" args={['#c5d8e8', 20, 100]} />

        <ambientLight intensity={0.5} color={0xfff5e6} />
        <directionalLight
          position={[20, 30, 10]}
          intensity={1}
          color={0xfff0d0}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={80}
          shadow-camera-left={-40}
          shadow-camera-right={40}
          shadow-camera-top={40}
          shadow-camera-bottom={-40}
        />
        <hemisphereLight args={[0xffe4c4, 0x3a5f3a, 0.3]} />

        {/* Ground */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color={0x4a7c59} roughness={0.95} />
        </mesh>

        {/* Village houses */}
        <ChineseHouse position={[-10, 0, -5]} rotation={0.3} />
        <ChineseHouse position={[8, 0, -8]} rotation={-0.2} scale={1.2} />
        <ChineseHouse position={[-5, 0, -20]} rotation={0.5} scale={0.9} />
        <ChineseHouse position={[12, 0, -15]} rotation={-0.4} scale={1.1} />
        <ChineseHouse position={[0, 0, -25]} rotation={0} scale={1.3} />

        {/* NPCs */}
        <NPC position={[0, 0, -2]} name="老翁" onClick={() => handleNPCClick('老翁')} />
        <NPC position={[-6, 0, -10]} name="渔女" onClick={() => handleNPCClick('渔女')} />
        <NPC position={[5, 0, -12]} name="书生" onClick={() => handleNPCClick('书生')} />
        <NPC position={[-3, 0, -18]} name="童子" onClick={() => handleNPCClick('童子')} />

        {/* Lanterns */}
        <ChineseLantern position={[-9, 4, -4]} />
        <ChineseLantern position={[9, 4, -7]} />
        <ChineseLantern position={[0, 4, -24]} />
        <ChineseLantern position={[-4, 4, -19]} />

        {/* Bridge */}
        <Bridge position={[3, 0, -8]} />

        {/* Small pond */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[15, 0.05, -5]}>
          <circleGeometry args={[6, 32]} />
          <meshStandardMaterial color={0x2e8b8b} transparent opacity={0.5} roughness={0.1} />
        </mesh>

        {/* Peach trees around village */}
        {Array.from({ length: 30 }).map((_, i) => {
          const angle = (i / 30) * Math.PI * 2
          const r = 25 + Math.random() * 15
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

        <PlayerController />
      </Canvas>

      {/* Dialogue overlay */}
      {dialogue && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
          <div
            className="px-8 py-4 rounded-sm max-w-md text-center cursor-pointer"
            style={{
              backgroundColor: 'rgba(26, 15, 10, 0.9)',
              border: '1px solid #5d4037',
              color: '#d4c5a9',
              letterSpacing: '0.05em',
              fontSize: '1.1rem',
            }}
            onClick={() => setDialogue(null)}
          >
            {dialogue}
            <p className="text-xs mt-2 opacity-40">点击关闭</p>
          </div>
        </div>
      )}

      {/* Ending trigger - visit all NPCs */}
      <EndingCheck visitedNPCs={Object.keys(dialogues)} />

      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none z-10">
        <p className="text-sm opacity-40" style={{ color: '#333', letterSpacing: '0.15em' }}>
          WASD 移动 · 点击村民对话
        </p>
      </div>
    </div>
  )
}

function EndingCheck({ visitedNPCs }: { visitedNPCs: string[] }) {
  const visitNPC = useGameStore((s) => s.visitNPC)
  const [showChoice, setShowChoice] = useState(false)

  useEffect(() => {
    visitedNPCs.forEach((name) => visitNPC(name))
    if (visitedNPCs.length >= 3 && !showChoice) {
      const timer = setTimeout(() => setShowChoice(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [visitedNPCs, showChoice, visitNPC])

  if (!showChoice) return null

  return (
    <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/50">
      <div className="text-center p-8 rounded-sm max-w-lg" style={{ backgroundColor: 'rgba(26, 15, 10, 0.95)', border: '1px solid #5d4037' }}>
        <p className="text-2xl mb-6" style={{ color: '#d4c5a9', letterSpacing: '0.1em' }}>
          你已与桃源中人交谈，是时候做出选择了
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => { useGameStore.getState().setEnding('return'); advanceScene() }}
            className="px-6 py-3 rounded-sm border cursor-pointer transition-all hover:scale-105"
            style={{ borderColor: '#5d4037', color: '#d4c5a9', backgroundColor: 'rgba(93, 64, 55, 0.2)' }}
          >
            回归尘世
          </button>
          <button
            onClick={() => { useGameStore.getState().setEnding('stay'); advanceScene() }}
            className="px-6 py-3 rounded-sm border cursor-pointer transition-all hover:scale-105"
            style={{ borderColor: '#5d4037', color: '#d4c5a9', backgroundColor: 'rgba(93, 64, 55, 0.2)' }}
          >
            留在桃源
          </button>
        </div>
      </div>
    </div>
  )
}

