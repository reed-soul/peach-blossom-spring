import { useRef, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

export type VillageNpcRole = 'elder' | 'fisher' | 'scholar' | 'child'

const ROLE_STYLES: Record<VillageNpcRole, { robe: string; skin: string; accent: string }> = {
  elder: { robe: '#5c4a3a', skin: '#e8c9a0', accent: '#8b7355' },
  fisher: { robe: '#4a6741', skin: '#ffdab9', accent: '#6b8e4e' },
  scholar: { robe: '#3d4a5c', skin: '#f5deb3', accent: '#5a6a7a' },
  child: { robe: '#8b6914', skin: '#ffe4c4', accent: '#c9a06b' },
}

const NPC_ROLE_BY_NAME: Record<string, VillageNpcRole> = {
  老翁: 'elder',
  渔女: 'fisher',
  书生: 'scholar',
  童子: 'child',
}

function useGradientMap() {
  return useMemo(() => {
    const data = new Uint8Array([90, 170, 245])
    const tex = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat)
    tex.needsUpdate = true
    tex.minFilter = THREE.NearestFilter
    tex.magFilter = THREE.NearestFilter
    return tex
  }, [])
}

function ToonPart({
  geom,
  color,
  gradientMap,
  position,
  scale,
}: {
  geom: ReactNode
  color: string
  gradientMap: THREE.Texture
  position?: [number, number, number]
  scale?: number | [number, number, number]
}) {
  const mat = useMemo(
    () => new THREE.MeshToonMaterial({ color, gradientMap }),
    [color, gradientMap],
  )

  return (
    <group position={position} scale={scale}>
      <mesh material={mat} castShadow>
        {geom}
      </mesh>
      <mesh scale={1.04} renderOrder={-1}>
        {geom}
        <meshBasicMaterial color="#15110c" side={THREE.BackSide} />
      </mesh>
    </group>
  )
}

export function VillageNpc({
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
  const gradientMap = useGradientMap()
  const role = NPC_ROLE_BY_NAME[name] ?? 'elder'
  const style = ROLE_STYLES[role]

  useFrame((state) => {
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
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 1.5 + position[0]) * 0.03
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
      <group scale={bodyScale}>
        <ToonPart
          geom={<capsuleGeometry args={[0.32, 0.9, 6, 10]} />}
          color={style.robe}
          gradientMap={gradientMap}
          position={[0, 0.95, 0]}
        />
        <ToonPart
          geom={<sphereGeometry args={[0.32, 10, 10]} />}
          color={style.skin}
          gradientMap={gradientMap}
          position={[0, 1.85, 0]}
        />
        {role === 'elder' && (
          <ToonPart
            geom={<boxGeometry args={[0.5, 0.08, 0.35]} />}
            color={style.accent}
            gradientMap={gradientMap}
            position={[0, 2.15, 0]}
          />
        )}
        {role === 'scholar' && (
          <ToonPart
            geom={<coneGeometry args={[0.35, 0.35, 6]} />}
            color={style.accent}
            gradientMap={gradientMap}
            position={[0, 2.2, 0]}
          />
        )}
        {role === 'child' && (
          <ToonPart
            geom={<sphereGeometry args={[0.12, 6, 6]} />}
            color="#ffb7c5"
            gradientMap={gradientMap}
            position={[0.2, 2.05, 0.15]}
          />
        )}
      </group>
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
