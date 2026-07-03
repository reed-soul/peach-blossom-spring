import { useMemo } from 'react'
import * as THREE from 'three'
import { PbrTextures } from '../../../cinematic/textures/PbrTextures'

export function ChineseHouse({
  position,
  rotation = 0,
  scale = 1,
  wallColor = 0xf5e6d0,
}: {
  position: [number, number, number]
  rotation?: number
  scale?: number
  wallColor?: number
}) {
  const brickMap = useMemo(() => PbrTextures.brick([2, 1]), [])
  const woodMap = useMemo(() => PbrTextures.wood([3, 3]), [])
  const woodRough = useMemo(() => PbrTextures.woodRough([3, 3]), [])
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[4, 3, 3]} />
        <meshStandardMaterial color={wallColor} map={brickMap} roughness={0.92} />
      </mesh>
      <mesh position={[0, 3.8, 0]} castShadow>
        <coneGeometry args={[3.5, 2, 4]} />
        <meshStandardMaterial color={0x3a2820} map={woodMap} roughnessMap={woodRough} roughness={0.85} />
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

export function ChineseLantern({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.4, 0.4, 0.8, 8]} />
        <meshStandardMaterial color={0xcc0000} emissive={0x880000} emissiveIntensity={0.3} />
      </mesh>
      <pointLight color={0xffd700} intensity={2} distance={8} />
    </group>
  )
}

export function VillageBridge({ position }: { position: [number, number, number] }) {
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

export function VillagePeachTrees({ centerZ = -8 }: { centerZ?: number }) {
  const trees = useMemo(
    () =>
      Array.from({ length: 24 }).map((_, i) => {
        const angle = (i / 24) * Math.PI * 2
        const r = 22 + Math.sin(i * 4.7) * 5
        return {
          x: Math.cos(angle) * r,
          z: Math.sin(angle) * r + centerZ,
          scale: 0.8 + Math.sin(i * 2.3) * 0.3,
        }
      }),
    [centerZ],
  )

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
