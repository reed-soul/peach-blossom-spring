import { useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three/webgpu'
import { NpcSkeleton, type NpcAction } from '../npc/NpcSkeleton'
import { npcRoleFromName } from './npcParts'

export type VillageNpcRole = 'elder' | 'fisher' | 'scholar' | 'child'

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
      <Html position={[0, role === 'child' ? 2.6 : 3, 0]} center>
        <div
          style={{
            color: '#d4c5a9',
            fontSize: '13px',
            letterSpacing: '0.1em',
            textShadow: '0 0 8px rgba(0,0,0,0.9)',
            whiteSpace: 'nowrap',
            opacity: 0.85,
          }}
        >
          {name}
        </div>
      </Html>
      {inRange && (
        <Html position={[0, role === 'child' ? 3.2 : 3.8, 0]} center>
          <div
            style={{
              color: '#ffd700',
              fontSize: '12px',
              textShadow: '0 0 8px rgba(0,0,0,0.9)',
              whiteSpace: 'nowrap',
            }}
          >
            按 E 对话
          </div>
        </Html>
      )}
    </group>
  )
}
