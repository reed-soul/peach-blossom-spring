import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three/webgpu'
import {
  ProceduralNpcFigure,
  type NpcFigureRole,
  type NpcSkeletonRefs,
} from '../village/npcParts'

export type NpcAction = 'idle' | 'talking'

function lerpScalar(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export interface NpcSkeletonProps {
  role: NpcFigureRole
  actionRef: React.MutableRefObject<NpcAction>
  scale?: number
}

export function NpcSkeleton({ role, actionRef, scale = 1 }: NpcSkeletonProps) {
  const rootRef = useRef<THREE.Group>(null)
  const torsoRef = useRef<THREE.Group>(null)
  const headRef = useRef<THREE.Group>(null)
  const leftArmRef = useRef<THREE.Group>(null)
  const rightArmRef = useRef<THREE.Group>(null)
  const tRef = useRef(0)
  const blended = useRef({
    torsoY: 0,
    torsoRotX: 0,
    torsoRotZ: 0,
    headRotX: 0,
    headRotY: 0,
    leftArmX: 0.15,
    leftArmZ: 0,
    rightArmX: 0.15,
    rightArmZ: 0,
  })

  const skeletonRefs: NpcSkeletonRefs = {
    torsoRef,
    headRef,
    leftArmRef,
    rightArmRef,
  }

  useFrame((_, delta) => {
    tRef.current += delta
    const t = tRef.current
    const action = actionRef.current
    const k = 0.12

    let tgt = {
      torsoY: 0,
      torsoRotX: 0,
      torsoRotZ: 0,
      headRotX: 0,
      headRotY: 0,
      leftArmX: 0.15,
      leftArmZ: 0,
      rightArmX: 0.15,
      rightArmZ: 0,
    }

    if (action === 'talking') {
      tgt.torsoY = Math.sin(t * 2.2) * 0.012
      tgt.torsoRotX = 0.03 + Math.sin(t * 2.2 + 0.4) * 0.015
      tgt.headRotX = Math.sin(t * 5.5) * 0.14
      tgt.headRotY = Math.sin(t * 0.7) * 0.035
      tgt.leftArmX = 0.45 + Math.sin(t * 3.8) * 0.22
      tgt.rightArmX = 0.55 + Math.sin(t * 3.8 + 1.2) * 0.18
      tgt.leftArmZ = Math.sin(t * 4.2) * 0.18
      tgt.rightArmZ = -Math.sin(t * 4.2 + 0.6) * 0.14
    } else {
      tgt.torsoY = Math.sin(t * 1.5) * 0.02
      tgt.torsoRotX = Math.sin(t * 1.5 + 0.3) * 0.022
      tgt.torsoRotZ = Math.sin(t * 0.8) * 0.014
      tgt.headRotY = Math.sin(t * 0.5) * 0.09
      tgt.headRotX = Math.sin(t * 0.9 + 1.2) * 0.018
      tgt.leftArmX = 0.15 + Math.sin(t * 0.8) * 0.05
      tgt.rightArmX = 0.15 - Math.sin(t * 0.8) * 0.05
      tgt.leftArmZ = Math.sin(t * 0.6) * 0.03
      tgt.rightArmZ = -Math.sin(t * 0.6) * 0.03
    }

    const b = blended.current
    b.torsoY = lerpScalar(b.torsoY, tgt.torsoY, k)
    b.torsoRotX = lerpScalar(b.torsoRotX, tgt.torsoRotX, k)
    b.torsoRotZ = lerpScalar(b.torsoRotZ, tgt.torsoRotZ, k)
    b.headRotX = lerpScalar(b.headRotX, tgt.headRotX, k)
    b.headRotY = lerpScalar(b.headRotY, tgt.headRotY, k)
    b.leftArmX = lerpScalar(b.leftArmX, tgt.leftArmX, k)
    b.leftArmZ = lerpScalar(b.leftArmZ, tgt.leftArmZ, k)
    b.rightArmX = lerpScalar(b.rightArmX, tgt.rightArmX, k)
    b.rightArmZ = lerpScalar(b.rightArmZ, tgt.rightArmZ, k)

    if (torsoRef.current) {
      torsoRef.current.position.y = b.torsoY
      torsoRef.current.rotation.x = b.torsoRotX
      torsoRef.current.rotation.z = b.torsoRotZ
    }
    if (headRef.current) {
      headRef.current.rotation.x = b.headRotX
      headRef.current.rotation.y = b.headRotY
    }
    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = b.leftArmX
      leftArmRef.current.rotation.z = b.leftArmZ
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.x = b.rightArmX
      rightArmRef.current.rotation.z = b.rightArmZ
    }
  })

  return (
    <group ref={rootRef} scale={scale}>
      <ProceduralNpcFigure role={role} skeletonRefs={skeletonRefs} />
    </group>
  )
}
