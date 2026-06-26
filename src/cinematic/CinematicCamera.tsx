import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { DirectorState } from './types'

export interface CinematicCameraProps {
  stateRef: React.MutableRefObject<DirectorState>
  hasStarted: boolean
}

const tmpTarget = new THREE.Vector3()

export function CinematicCamera({ stateRef, hasStarted }: CinematicCameraProps) {
  const { camera } = useThree()
  const inited = useRef(false)

  useFrame(() => {
    if (!hasStarted && !inited.current) return
    inited.current = true
    const s = stateRef.current
    const [px, py, pz] = s.camera.pos
    const [lx, ly, lz] = s.camera.lookAt
    // 平滑跟随目标，营造电影感缓动
    camera.position.lerp(tmpTarget.set(px, py, pz), 0.1)
    camera.lookAt(tmpTarget.set(lx, ly, lz))
    const cam = camera as THREE.PerspectiveCamera
    if (Math.abs(cam.fov - s.camera.fov) > 0.01) {
      cam.fov = s.camera.fov
      cam.updateProjectionMatrix()
    }
  })

  return null
}
