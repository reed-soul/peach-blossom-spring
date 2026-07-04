import { useMemo } from 'react'
import type { ReactNode, RefObject } from 'react'
import * as THREE from 'three'

export type NpcFigureRole = 'elder' | 'fisher' | 'scholar' | 'child' | 'farmer'

export type NpcSkeletonRefs = {
  torsoRef?: RefObject<THREE.Group>
  headRef?: RefObject<THREE.Group>
  leftArmRef?: RefObject<THREE.Group>
  rightArmRef?: RefObject<THREE.Group>
}

export function useGradientMap() {
  return useMemo(() => {
    const data = new Uint8Array([60, 120, 170, 215, 250])
    const tex = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat)
    tex.needsUpdate = true
    tex.minFilter = THREE.NearestFilter
    tex.magFilter = THREE.NearestFilter
    return tex
  }, [])
}

export function ToonPart({
  geom,
  geometry,
  color,
  gradientMap,
  position,
  rotation,
  scale,
}: {
  geom?: ReactNode
  geometry?: THREE.BufferGeometry
  color: string
  gradientMap: THREE.Texture
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number | [number, number, number]
}) {
  const mat = useMemo(
    () => new THREE.MeshToonMaterial({ color, gradientMap }),
    [color, gradientMap],
  )

  const meshProps = geometry ? { geometry } : {}

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh material={mat} castShadow {...meshProps}>
        {geom}
      </mesh>
      <mesh scale={1.04} renderOrder={-1} {...meshProps}>
        {geom}
        <meshBasicMaterial color="#15110c" side={THREE.BackSide} />
      </mesh>
    </group>
  )
}

function makeRobeProfile(points: [number, number][]): THREE.LatheGeometry {
  return new THREE.LatheGeometry(
    points.map(([r, y]) => new THREE.Vector2(r, y)),
    24,
  )
}

const ROBE_GEOMETRIES: Record<NpcFigureRole, THREE.LatheGeometry> = {
  elder: makeRobeProfile([
    [0.001, 0], [0.14, -0.02], [0.16, -0.22], [0.11, -0.38],
    [0.13, -0.52], [0.2, -0.72], [0.24, -0.88],
  ]),
  fisher: makeRobeProfile([
    [0.001, 0], [0.2, -0.02], [0.24, -0.2], [0.18, -0.38],
    [0.22, -0.55], [0.28, -0.72], [0.3, -0.85],
  ]),
  scholar: makeRobeProfile([
    [0.001, 0], [0.19, -0.02], [0.22, -0.22], [0.17, -0.4],
    [0.21, -0.58], [0.27, -0.75], [0.3, -0.9],
  ]),
  child: makeRobeProfile([
    [0.001, 0], [0.17, -0.02], [0.2, -0.18], [0.18, -0.32], [0.2, -0.45],
  ]),
  farmer: makeRobeProfile([
    [0.001, 0], [0.22, -0.02], [0.26, -0.2], [0.22, -0.36],
    [0.25, -0.52], [0.28, -0.68], [0.26, -0.78],
  ]),
}

const ROLE_STYLES: Record<NpcFigureRole, { robe: string; skin: string; accent: string; hair: string }> = {
  elder: { robe: '#5c4a3a', skin: '#e8c9a0', accent: '#8b7355', hair: '#c8c0b0' },
  fisher: { robe: '#3d6b6b', skin: '#ffdab9', accent: '#5a8a7a', hair: '#1a1612' },
  scholar: { robe: '#3d4a6c', skin: '#f5deb3', accent: '#5a6a8a', hair: '#1a1612' },
  child: { robe: '#8b6914', skin: '#ffe4c4', accent: '#c9a06b', hair: '#1a1612' },
  farmer: { robe: '#7a5234', skin: '#e0b890', accent: '#d8c4a0', hair: '#2a2018' },
}

type RoleLayout = {
  headSize: number
  bodyY: number
  neckY: number
  shoulderY: number
  shoulderX: number
  legY: number
}

function roleLayout(role: NpcFigureRole): RoleLayout {
  if (role === 'child') {
    return { headSize: 0.28, bodyY: 0.88, neckY: 1.38, shoulderY: 0.82, shoulderX: 0.2, legY: 0.25 }
  }
  if (role === 'elder') {
    return { headSize: 0.24, bodyY: 1.02, neckY: 1.58, shoulderY: 0.62, shoulderX: 0.18, legY: 0.22 }
  }
  return { headSize: 0.26, bodyY: 1.05, neckY: 1.62, shoulderY: 0.88, shoulderX: 0.22, legY: 0.25 }
}

function ElderAccessories({
  gradientMap,
  headLocalY,
}: {
  gradientMap: THREE.Texture
  headLocalY: number
}) {
  const beardStrands: [number, number, number, number][] = [
    [-0.06, -0.18, -0.1, 0.04],
    [0, -0.22, -0.11, 0.05],
    [0.06, -0.18, -0.1, 0.04],
    [-0.03, -0.28, -0.09, 0.06],
    [0.03, -0.28, -0.09, 0.06],
    [0, -0.34, -0.08, 0.07],
  ]

  return (
    <>
      <ToonPart
        geom={<boxGeometry args={[0.28, 0.35, 0.12]} />}
        color="#e8e0d8"
        gradientMap={gradientMap}
        position={[0, headLocalY - 0.32, -0.08]}
      />
      {beardStrands.map(([x, y, z, h], i) => (
        <ToonPart
          key={i}
          geom={<boxGeometry args={[0.025, h, 0.02]} />}
          color="#f5f0ea"
          gradientMap={gradientMap}
          position={[x, headLocalY + y, z]}
          rotation={[0.08 + i * 0.02, 0, (i - 2.5) * 0.06]}
        />
      ))}
    </>
  )
}

function FisherAccessories({
  gradientMap,
  style,
  headLocalY,
}: {
  gradientMap: THREE.Texture
  style: (typeof ROLE_STYLES)['fisher']
  headLocalY: number
}) {
  return (
    <>
      <ToonPart
        geom={<sphereGeometry args={[0.14, 10, 8]} />}
        color={style.hair}
        gradientMap={gradientMap}
        position={[0, headLocalY + 0.18, -0.06]}
      />
      <ToonPart
        geom={<cylinderGeometry args={[0.015, 0.015, 0.22, 6]} />}
        color="#c0c0c0"
        gradientMap={gradientMap}
        position={[0.1, headLocalY + 0.24, -0.02]}
        rotation={[0.4, 0, 0.6]}
      />
      <ToonPart
        geom={<boxGeometry args={[0.04, 0.02, 0.08]} />}
        color="#c9a24a"
        gradientMap={gradientMap}
        position={[0.12, headLocalY + 0.14, -0.1]}
        rotation={[0, 0.3, 0]}
      />
    </>
  )
}

function ScholarHeadAccessories({
  gradientMap,
  style,
  headSize,
  headLocalY,
}: {
  gradientMap: THREE.Texture
  style: (typeof ROLE_STYLES)['scholar']
  headSize: number
  headLocalY: number
}) {
  return (
    <>
      <ToonPart
        geom={<boxGeometry args={[headSize * 1.6, 0.06, headSize * 1.1]} />}
        color={style.accent}
        gradientMap={gradientMap}
        position={[0, headLocalY + headSize + 0.04, 0]}
      />
      <ToonPart
        geom={<boxGeometry args={[0.38, 0.04, 0.22]} />}
        color={style.robe}
        gradientMap={gradientMap}
        position={[-0.32, headLocalY + headSize * 0.6, -0.06]}
        rotation={[0, 0.3, 0.15]}
      />
      <ToonPart
        geom={<boxGeometry args={[0.38, 0.04, 0.22]} />}
        color={style.robe}
        gradientMap={gradientMap}
        position={[0.32, headLocalY + headSize * 0.6, -0.06]}
        rotation={[0, -0.3, -0.15]}
      />
      <ToonPart
        geom={<sphereGeometry args={[0.12, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55]} />}
        color={style.hair}
        gradientMap={gradientMap}
        position={[0, headLocalY + 0.08, 0]}
      />
    </>
  )
}

function ChildHeadAccessories({
  gradientMap,
  style,
  headLocalY,
}: {
  gradientMap: THREE.Texture
  style: (typeof ROLE_STYLES)['child']
  headLocalY: number
}) {
  return (
    <>
      <ToonPart
        geom={<sphereGeometry args={[0.26, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5]} />}
        color={style.hair}
        gradientMap={gradientMap}
        position={[0, headLocalY + 0.06, 0]}
      />
      <ToonPart
        geom={<sphereGeometry args={[0.09, 8, 8]} />}
        color={style.hair}
        gradientMap={gradientMap}
        position={[-0.14, headLocalY + 0.28, 0.02]}
      />
      <ToonPart
        geom={<sphereGeometry args={[0.09, 8, 8]} />}
        color={style.hair}
        gradientMap={gradientMap}
        position={[0.14, headLocalY + 0.28, 0.02]}
      />
    </>
  )
}

function ChildTorsoAccessories({
  gradientMap,
  bodyY,
}: {
  gradientMap: THREE.Texture
  bodyY: number
}) {
  return (
    <ToonPart
      geom={<planeGeometry args={[0.22, 0.18]} />}
      color="#c62828"
      gradientMap={gradientMap}
      position={[0, bodyY - 0.12, 0.2]}
      rotation={[0.08, 0, 0]}
    />
  )
}

function FisherTorsoAccessories({
  gradientMap,
  style,
  bodyY,
}: {
  gradientMap: THREE.Texture
  style: (typeof ROLE_STYLES)['fisher']
  bodyY: number
}) {
  const waistY = bodyY - 0.42
  return (
    <>
      <ToonPart
        geom={<planeGeometry args={[0.32, 0.38]} />}
        color="#4a7a6a"
        gradientMap={gradientMap}
        position={[0, waistY, 0.22]}
        rotation={[0.05, 0, 0]}
      />
      <ToonPart
        geom={<boxGeometry args={[0.08, 0.06, 0.04]} />}
        color={style.robe}
        gradientMap={gradientMap}
        position={[-0.1, waistY + 0.02, 0.24]}
        rotation={[0, 0, 0.35]}
      />
      <ToonPart
        geom={<boxGeometry args={[0.08, 0.06, 0.04]} />}
        color={style.robe}
        gradientMap={gradientMap}
        position={[0.1, waistY + 0.02, 0.24]}
        rotation={[0, 0, -0.35]}
      />
    </>
  )
}

function ScholarTorsoAccessories({
  gradientMap,
  style,
  bodyY,
}: {
  gradientMap: THREE.Texture
  style: (typeof ROLE_STYLES)['scholar']
  bodyY: number
}) {
  return (
    <ToonPart
      geom={<cylinderGeometry args={[0.06, 0.06, 0.42, 8]} />}
      color="#d4c5a0"
      gradientMap={gradientMap}
      position={[0, bodyY - 0.35, -0.28]}
      rotation={[0.15, 0, 0]}
    />
  )
}

function StandardLimbs({
  gradientMap,
  style,
  layout,
  leftArmRef,
  rightArmRef,
  headRef,
  role,
}: {
  gradientMap: THREE.Texture
  style: (typeof ROLE_STYLES)[NpcFigureRole]
  layout: RoleLayout
  leftArmRef?: RefObject<THREE.Group>
  rightArmRef?: RefObject<THREE.Group>
  headRef?: RefObject<THREE.Group>
  role: NpcFigureRole
}) {
  const { shoulderX, shoulderY, legY, headSize, neckY } = layout
  const headLocalY = headSize

  return (
    <>
      <group ref={leftArmRef} position={[-shoulderX, shoulderY, 0]}>
        <ToonPart
          geom={<cylinderGeometry args={[0.07, 0.06, 0.55, 6]} />}
          color={style.robe}
          gradientMap={gradientMap}
          position={[0, -0.28, 0]}
          rotation={[0, 0, 0.15]}
        />
        <ToonPart
          geom={<sphereGeometry args={[0.07, 6, 6]} />}
          color={style.skin}
          gradientMap={gradientMap}
          position={[0, -0.58, 0]}
        />
      </group>

      <group ref={rightArmRef} position={[shoulderX, shoulderY, 0]}>
        <ToonPart
          geom={<cylinderGeometry args={[0.07, 0.06, 0.55, 6]} />}
          color={style.robe}
          gradientMap={gradientMap}
          position={[0, -0.28, 0]}
          rotation={[0, 0, -0.15]}
        />
        <ToonPart
          geom={<sphereGeometry args={[0.07, 6, 6]} />}
          color={style.skin}
          gradientMap={gradientMap}
          position={[0, -0.58, 0]}
        />
        {role === 'scholar' && (
          <ToonPart
            geom={<circleGeometry args={[0.22, 12, 0, Math.PI * 0.55]} />}
            color="#e8dcc8"
            gradientMap={gradientMap}
            position={[0.08, -0.42, -0.12]}
            rotation={[0.5, -0.4, 0.3]}
          />
        )}
      </group>

      <ToonPart
        geom={<cylinderGeometry args={[0.08, 0.07, 0.5, 6]} />}
        color={style.robe}
        gradientMap={gradientMap}
        position={[-0.12, legY, 0]}
      />
      <ToonPart
        geom={<cylinderGeometry args={[0.08, 0.07, 0.5, 6]} />}
        color={style.robe}
        gradientMap={gradientMap}
        position={[0.12, legY, 0]}
      />

      <group ref={headRef} position={[0, neckY, 0]}>
        <ToonPart
          geom={<sphereGeometry args={[headSize, 14, 12]} />}
          color={style.skin}
          gradientMap={gradientMap}
          position={[0, headLocalY, 0]}
        />
        {role === 'fisher' && (
          <FisherAccessories gradientMap={gradientMap} style={style as (typeof ROLE_STYLES)['fisher']} headLocalY={headLocalY} />
        )}
        {role === 'scholar' && (
          <ScholarHeadAccessories
            gradientMap={gradientMap}
            style={style as (typeof ROLE_STYLES)['scholar']}
            headSize={headSize}
            headLocalY={headLocalY}
          />
        )}
        {role === 'child' && (
          <ChildHeadAccessories
            gradientMap={gradientMap}
            style={style as (typeof ROLE_STYLES)['child']}
            headLocalY={headLocalY}
          />
        )}
      </group>
    </>
  )
}

function ElderLimbs({
  gradientMap,
  style,
  layout,
  leftArmRef,
  rightArmRef,
  headRef,
}: {
  gradientMap: THREE.Texture
  style: (typeof ROLE_STYLES)['elder']
  layout: RoleLayout
  leftArmRef?: RefObject<THREE.Group>
  rightArmRef?: RefObject<THREE.Group>
  headRef?: RefObject<THREE.Group>
}) {
  const { shoulderX, shoulderY, headSize, neckY } = layout
  const headLocalY = headSize

  return (
    <>
      <group ref={leftArmRef} position={[-shoulderX, shoulderY, 0]}>
        <ToonPart
          geom={<cylinderGeometry args={[0.05, 0.04, 0.48, 6]} />}
          color={style.robe}
          gradientMap={gradientMap}
          position={[0, -0.24, 0]}
          rotation={[0, 0, 0.2]}
        />
      </group>

      <group ref={rightArmRef} position={[shoulderX, shoulderY, 0.04]}>
        <ToonPart
          geom={<cylinderGeometry args={[0.05, 0.04, 0.48, 6]} />}
          color={style.robe}
          gradientMap={gradientMap}
          position={[0, -0.24, 0]}
          rotation={[0, 0, -0.1]}
        />
        <ToonPart
          geom={<cylinderGeometry args={[0.025, 0.03, 1.35, 6]} />}
          color={style.accent}
          gradientMap={gradientMap}
          position={[0.24, -0.55, 0.02]}
          rotation={[0, 0, 0.08]}
        />
        <ToonPart
          geom={<cylinderGeometry args={[0.02, 0.025, 0.18, 6]} />}
          color={style.accent}
          gradientMap={gradientMap}
          position={[0.38, 0.08, 0.04]}
          rotation={[0, 0, 1.1]}
        />
        <ToonPart
          geom={<sphereGeometry args={[0.05, 6, 6]} />}
          color="#4a3220"
          gradientMap={gradientMap}
          position={[0.24, -1.18, 0.02]}
        />
      </group>

      <ToonPart
        geom={<boxGeometry args={[0.14, 0.1, 0.22]} />}
        color="#6b4f3a"
        gradientMap={gradientMap}
        position={[-0.1, 0.06, 0.06]}
      />
      <ToonPart
        geom={<boxGeometry args={[0.14, 0.1, 0.22]} />}
        color="#6b4f3a"
        gradientMap={gradientMap}
        position={[0.1, 0.06, 0.06]}
      />

      <group ref={headRef} position={[0, neckY, 0]}>
        <ToonPart
          geom={<sphereGeometry args={[headSize, 14, 12]} />}
          color={style.skin}
          gradientMap={gradientMap}
          position={[0, headLocalY, 0]}
        />
        <ElderAccessories gradientMap={gradientMap} headLocalY={headLocalY} />
      </group>
    </>
  )
}

function FarmerExtras({
  gradientMap,
  style,
  headLocalY,
  bodyY,
  neckY,
}: {
  gradientMap: THREE.Texture
  style: (typeof ROLE_STYLES)['farmer']
  headLocalY: number
  bodyY: number
  neckY: number
}) {
  return (
    <>
      <ToonPart
        geom={<coneGeometry args={[0.38, 0.22, 10]} />}
        color={style.accent}
        gradientMap={gradientMap}
        position={[0, neckY + headLocalY + 0.18, 0]}
      />
      <ToonPart
        geom={<cylinderGeometry args={[0.42, 0.42, 0.04, 10]} />}
        color={style.accent}
        gradientMap={gradientMap}
        position={[0, neckY + headLocalY + 0.1, 0]}
      />
      <ToonPart
        geom={<cylinderGeometry args={[0.17, 0.15, 0.28, 6, 1, true]} />}
        color="#5c4030"
        gradientMap={gradientMap}
        position={[0, bodyY - 0.8, 0]}
      />
      <ToonPart
        geom={<cylinderGeometry args={[0.02, 0.025, 0.7, 5]} />}
        color="#6b4f3a"
        gradientMap={gradientMap}
        position={[-0.28, bodyY - 0.52, 0.05]}
        rotation={[0.1, 0.2, 0.5]}
      />
      <ToonPart
        geom={<boxGeometry args={[0.18, 0.04, 0.06]} />}
        color="#888888"
        gradientMap={gradientMap}
        position={[-0.42, bodyY - 0.2, 0.12]}
        rotation={[0, 0.3, 0.8]}
      />
    </>
  )
}

export function ProceduralNpcFigure({
  role,
  skeletonRefs,
}: {
  role: NpcFigureRole
  skeletonRefs?: NpcSkeletonRefs
}) {
  const gradientMap = useGradientMap()
  const style = ROLE_STYLES[role]
  const layout = roleLayout(role)
  const { bodyY, headSize, neckY } = layout
  const headLocalY = headSize

  const { torsoRef, headRef, leftArmRef, rightArmRef } = skeletonRefs ?? {}

  return (
    <group>
      <group ref={torsoRef}>
        <group position={[0, bodyY, 0]}>
          <ToonPart geometry={ROBE_GEOMETRIES[role]} color={style.robe} gradientMap={gradientMap} />
        </group>

        {role === 'fisher' && (
          <FisherTorsoAccessories gradientMap={gradientMap} style={style as (typeof ROLE_STYLES)['fisher']} bodyY={bodyY} />
        )}
        {role === 'scholar' && (
          <ScholarTorsoAccessories gradientMap={gradientMap} style={style as (typeof ROLE_STYLES)['scholar']} bodyY={bodyY} />
        )}
        {role === 'child' && <ChildTorsoAccessories gradientMap={gradientMap} bodyY={bodyY} />}

        {role === 'elder' ? (
          <ElderLimbs
            gradientMap={gradientMap}
            style={style as (typeof ROLE_STYLES)['elder']}
            layout={layout}
            leftArmRef={leftArmRef}
            rightArmRef={rightArmRef}
            headRef={headRef}
          />
        ) : role === 'farmer' ? (
          <>
            <StandardLimbs
              gradientMap={gradientMap}
              style={style}
              layout={layout}
              leftArmRef={leftArmRef}
              rightArmRef={rightArmRef}
              headRef={headRef}
              role={role}
            />
            <FarmerExtras
              gradientMap={gradientMap}
              style={style as (typeof ROLE_STYLES)['farmer']}
              headLocalY={headLocalY}
              bodyY={bodyY}
              neckY={neckY}
            />
          </>
        ) : (
          <StandardLimbs
            gradientMap={gradientMap}
            style={style}
            layout={layout}
            leftArmRef={leftArmRef}
            rightArmRef={rightArmRef}
            headRef={headRef}
            role={role}
          />
        )}
      </group>
    </group>
  )
}

export function npcRoleFromName(name: string): NpcFigureRole {
  const map: Record<string, NpcFigureRole> = {
    老翁: 'elder',
    渔女: 'fisher',
    书生: 'scholar',
    童子: 'child',
  }
  return map[name] ?? 'elder'
}
