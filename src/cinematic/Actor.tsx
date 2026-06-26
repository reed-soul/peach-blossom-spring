import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ActorAction } from './types'

// 单个带描边的 toon 部件
function ToonPart({
  geometry,
  position,
  rotation,
  scale = 1,
  baseColor,
  gradientMap,
  outlineScale = 1.05,
}: {
  geometry: React.ReactNode
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
  baseColor: string
  gradientMap?: THREE.Texture
  outlineScale?: number
}) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh castShadow>
        {geometry}
        <meshToonMaterial color={baseColor} gradientMap={gradientMap} />
      </mesh>
      <mesh scale={[outlineScale, outlineScale, outlineScale]}>
        {geometry}
        <meshBasicMaterial color="#1a1a1a" side={THREE.BackSide} />
      </mesh>
    </group>
  )
}

export interface ActorProps {
  posRef: React.MutableRefObject<[number, number, number]>
  facingRef: React.MutableRefObject<number>
  actionRef: React.MutableRefObject<ActorAction>
}

export function Actor({ posRef, facingRef, actionRef }: ActorProps) {
  const group = useRef<THREE.Group>(null)
  const leftArm = useRef<THREE.Group>(null)
  const rightArm = useRef<THREE.Group>(null)
  const leftLeg = useRef<THREE.Group>(null)
  const rightLeg = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const tRef = useRef(0)

  // 简单的 toon 渐变贴图（3 级明暗）
  const gradientMap = useMemo(() => {
    const data = new Uint8Array([80, 160, 240])
    const tex = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat)
    tex.needsUpdate = true
    tex.minFilter = THREE.NearestFilter
    tex.magFilter = THREE.NearestFilter
    return tex
  }, [])

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    const [x, y, z] = posRef.current
    g.position.set(x, y, z)
    g.rotation.y = facingRef.current

    const action = actionRef.current
    tRef.current += delta * 8
    const t = tRef.current

    if (action === 'walk' || action === 'row' || action === 'enter') {
      const amp = action === 'row' ? 0.5 : 0.8
      const swing = Math.sin(t) * amp
      if (leftArm.current) leftArm.current.rotation.x = swing
      if (rightArm.current) rightArm.current.rotation.x = -swing
      if (leftLeg.current) leftLeg.current.rotation.x = -swing * 0.7
      if (rightLeg.current) rightLeg.current.rotation.x = swing * 0.7
      if (body.current) body.current.position.y = Math.abs(Math.sin(t)) * 0.05
    } else if (action === 'sit') {
      if (leftLeg.current) leftLeg.current.rotation.x = -Math.PI / 2
      if (rightLeg.current) rightLeg.current.rotation.x = -Math.PI / 2
      if (body.current) body.current.position.y = -0.4
    } else {
      // idle 呼吸
      const breathe = Math.sin(t * 0.4) * 0.03
      if (body.current) body.current.position.y = breathe
      if (leftArm.current) leftArm.current.rotation.x = breathe
      if (rightArm.current) rightArm.current.rotation.x = -breathe
    }
  })

  // 寻仙风配色：青衫、米白内衫、深褐腰带、束发黑、肤色
  return (
    <group ref={group}>
      <group ref={body}>
        {/* 内衫 */}
        <ToonPart
          geometry={<capsuleGeometry args={[0.28, 0.7, 4, 8]} />}
          position={[0, 1.0, 0]}
          baseColor="#f0e6d2"
          gradientMap={gradientMap}
        />
        {/* 外衫（青） */}
        <ToonPart
          geometry={<coneGeometry args={[0.5, 1.1, 8]} />}
          position={[0, 0.95, 0]}
          baseColor="#3a6b6b"
          gradientMap={gradientMap}
        />
        {/* 腰带 */}
        <ToonPart
          geometry={<cylinderGeometry args={[0.42, 0.42, 0.15, 8]} />}
          position={[0, 0.7, 0]}
          baseColor="#4a3520"
          gradientMap={gradientMap}
        />
        {/* 头 */}
        <ToonPart
          geometry={<sphereGeometry args={[0.26, 16, 16]} />}
          position={[0, 1.62, 0]}
          baseColor="#f5d5b0"
          gradientMap={gradientMap}
          outlineScale={1.06}
        />
        {/* 发髻 */}
        <ToonPart
          geometry={<sphereGeometry args={[0.18, 12, 12]} />}
          position={[0, 1.85, -0.02]}
          baseColor="#1c1c1c"
          gradientMap={gradientMap}
        />
        {/* 发簪 */}
        <mesh position={[0.12, 1.88, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 0.3, 6]} />
          <meshStandardMaterial color="#8b6914" metalness={0.6} roughness={0.3} />
        </mesh>

        {/* 左臂 */}
        <group ref={leftArm} position={[-0.32, 1.25, 0]}>
          <ToonPart
            geometry={<capsuleGeometry args={[0.09, 0.5, 4, 8]} />}
            position={[0, -0.25, 0]}
            baseColor="#3a6b6b"
            gradientMap={gradientMap}
          />
          <ToonPart
            geometry={<sphereGeometry args={[0.1, 8, 8]} />}
            position={[0, -0.55, 0]}
            baseColor="#f5d5b0"
            gradientMap={gradientMap}
          />
        </group>
        {/* 右臂 */}
        <group ref={rightArm} position={[0.32, 1.25, 0]}>
          <ToonPart
            geometry={<capsuleGeometry args={[0.09, 0.5, 4, 8]} />}
            position={[0, -0.25, 0]}
            baseColor="#3a6b6b"
            gradientMap={gradientMap}
          />
          <ToonPart
            geometry={<sphereGeometry args={[0.1, 8, 8]} />}
            position={[0, -0.55, 0]}
            baseColor="#f5d5b0"
            gradientMap={gradientMap}
          />
        </group>

        {/* 左腿 */}
        <group ref={leftLeg} position={[-0.14, 0.55, 0]}>
          <ToonPart
            geometry={<capsuleGeometry args={[0.11, 0.5, 4, 8]} />}
            position={[0, -0.25, 0]}
            baseColor="#2c2c2c"
            gradientMap={gradientMap}
          />
        </group>
        {/* 右腿 */}
        <group ref={rightLeg} position={[0.14, 0.55, 0]}>
          <ToonPart
            geometry={<capsuleGeometry args={[0.11, 0.5, 4, 8]} />}
            position={[0, -0.25, 0]}
            baseColor="#2c2c2c"
            gradientMap={gradientMap}
          />
        </group>
      </group>

      {/* 斗笠（小巧装饰） */}
      <mesh position={[0, 2.05, 0]}>
        <coneGeometry args={[0.35, 0.15, 12]} />
        <meshToonMaterial color="#6b5a3a" />
      </mesh>
    </group>
  )
}
