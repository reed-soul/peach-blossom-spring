import { useRef, useState, useEffect, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

export const CAVE_WORLD_Z = -62

export function CaveEntrance({ onTrigger }: { onTrigger?: () => void }) {
  const inRangeRef = useRef(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const { camera } = useThree()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === 'KeyE' && inRangeRef.current) {
        document.exitPointerLock?.()
        onTrigger?.()
      }
    },
    [onTrigger],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useFrame(() => {
    const cavePos = new THREE.Vector3(0, 0, CAVE_WORLD_Z)
    const dist = camera.position.distanceTo(cavePos)
    inRangeRef.current = dist < 12
    setShowPrompt(inRangeRef.current)
  })

  return (
    <group position={[0, 0, CAVE_WORLD_Z]}>
      <mesh position={[0, 3, 0]} castShadow>
        <torusGeometry args={[4, 2.5, 8, 12, Math.PI]} />
        <meshStandardMaterial color={0x3e2723} roughness={1} />
      </mesh>
      <mesh position={[0, 2, -1]}>
        <planeGeometry args={[8, 5]} />
        <meshBasicMaterial color={0x050505} />
      </mesh>
      <pointLight position={[0, 3, -3]} color={0xffd700} intensity={2.5} distance={12} />
      <spotLight
        position={[0, 4, 2]}
        angle={0.55}
        penumbra={0.5}
        intensity={2.5}
        distance={16}
        color={0xffd8a0}
      />
      {showPrompt && (
        <Html position={[0, 5, 4]} center>
          <div
            style={{
              color: '#d4c5a9',
              fontSize: '14px',
              letterSpacing: '0.1em',
              textShadow: '0 0 10px rgba(0,0,0,0.8)',
              whiteSpace: 'nowrap',
              opacity: 0.85,
            }}
          >
            按 E 进入山洞
          </div>
        </Html>
      )}
    </group>
  )
}
