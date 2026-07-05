import { useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three/webgpu'
import { NpcSkeleton, type NpcAction } from '../npc/NpcSkeleton'
import { npcRoleFromName } from './npcParts'

export type VillageNpcRole = 'elder' | 'fisher' | 'scholar' | 'child'

// Reusable temp vectors (avoid per-frame allocation).
const _worldPos = new THREE.Vector3()
const _projected = new THREE.Vector3()
const _labelOffset = new THREE.Vector3()

export function VillageNpc({
  position,
  name,
  onInteract,
  isTalking = false,
}: {
  position: [number, number, number]
  name: string
  onInteract: () => void
  isTalking?: boolean
}) {
  const ref = useRef<THREE.Group>(null)
  const actionRef = useRef<NpcAction>('idle')
  const [inRange, setInRange] = useState(false)
  const { camera } = useThree()
  const role = npcRoleFromName(name)

  // DOM ids for the two labels (name + interaction prompt).
  const nameId = `npc-label-${name}`
  const promptId = `npc-prompt-${name}`

  useEffect(() => {
    actionRef.current = isTalking ? 'talking' : 'idle'
  }, [isTalking])

  useFrame(() => {
    if (!ref.current) return
    const dir = new THREE.Vector3().subVectors(camera.position, ref.current.position)
    dir.y = 0
    if (dir.length() > 0.1) {
      ref.current.lookAt(
        ref.current.position.x + dir.x,
        ref.current.position.y,
        ref.current.position.z + dir.z,
      )
    }
    setInRange(camera.position.distanceTo(ref.current.position) < 6)

    // Project the NPC's label anchor (above head) to screen coords and update
    // the DOM labels. Replaces drei <Html> which crashes WebGPURenderer.
    const headHeight = role === 'child' ? 2.6 : 3
    _labelOffset.set(0, headHeight, 0)
    _worldPos.copy(ref.current.position).add(_labelOffset)
    _projected.copy(_worldPos).project(camera)

    const behind = _projected.z > 1
    const nameEl = document.getElementById(nameId)
    const promptEl = document.getElementById(promptId)

    if (behind) {
      if (nameEl) nameEl.style.display = 'none'
      if (promptEl) promptEl.style.display = 'none'
    } else {
      const x = (_projected.x * 0.5 + 0.5) * window.innerWidth
      const y = (-_projected.y * 0.5 + 0.5) * window.innerHeight
      const tf = `translate(-50%, -50%) translate(${x}px, ${y}px)`
      if (nameEl) {
        nameEl.style.display = ''
        nameEl.style.transform = tf
      }
      // Prompt sits slightly above the name.
      if (promptEl) {
        promptEl.style.display = ''
        promptEl.style.transform = `translate(-50%, -50%) translate(${x}px, ${y - 22}px)`
      }
    }
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'KeyE' && inRange) onInteract()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [inRange, onInteract])

  const bodyScale = role === 'child' ? 0.75 : 1

  return (
    <group ref={ref} position={position}>
      <NpcSkeleton role={role} actionRef={actionRef} scale={bodyScale} />
      {inRange && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8, 1, 32]} />
          <meshBasicMaterial color="#ffd700" transparent opacity={0.35} />
        </mesh>
      )}
      {/* Name + interaction labels are rendered as DOM by the scene parent
          (VillageSceneContent) using the ids npc-label-{name} / npc-prompt-{name}.
          This component only updates their screen positions per frame. */}
    </group>
  )
}

/**
 * DOM labels container — mount ONCE per village scene (outside <Canvas>).
 * Renders the name + "按 E 对话" prompt for every NPC; visibility/position
 * is driven by each VillageNpc's useFrame via id lookup.
 */
export function VillageNpcLabels({ names }: { names: string[] }) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
      {names.map((name) => (
        <div key={name}>
          <div
            id={`npc-label-${name}`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              color: '#d4c5a9',
              fontSize: '13px',
              letterSpacing: '0.1em',
              textShadow: '0 0 8px rgba(0,0,0,0.9)',
              whiteSpace: 'nowrap',
              opacity: 0.85,
              willChange: 'transform',
            }}
          >
            {name}
          </div>
          <div
            id={`npc-prompt-${name}`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              color: '#ffd700',
              fontSize: '12px',
              textShadow: '0 0 8px rgba(0,0,0,0.9)',
              whiteSpace: 'nowrap',
              willChange: 'transform',
            }}
          >
            按 E 对话
          </div>
        </div>
      ))}
    </div>
  )
}
