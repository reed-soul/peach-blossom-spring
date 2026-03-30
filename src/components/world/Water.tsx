import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function Water() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!meshRef.current) return
    const geo = meshRef.current.geometry
    const positions = geo.attributes.position
    const time = state.clock.elapsedTime

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const y = positions.getY(i)
      positions.setZ(i, Math.sin(x * 0.5 + time) * 0.1 + Math.cos(y * 0.3 + time * 0.7) * 0.08)
    }
    positions.needsUpdate = true
  })

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.3, 0]}>
      <planeGeometry args={[6, 200, 32, 200]} />
      <meshStandardMaterial
        color={0x2e8b8b}
        transparent
        opacity={0.5}
        roughness={0.1}
        metalness={0.3}
      />
    </mesh>
  )
}
