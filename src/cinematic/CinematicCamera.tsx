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
  // 持久化的 lookAt 当前向量，用于阻尼同步（消除硬切时"先转头再挪位"的割裂）
  const currentLook = useRef(new THREE.Vector3(0, 1.5, 0))

  useFrame(() => {
    if (!hasStarted && !inited.current) return
    inited.current = true
    const s = stateRef.current
    const [px, py, pz] = s.camera.pos
    const [lx, ly, lz] = s.camera.lookAt
    // 检测目标突变（Director 的 cut beat 会让 pos 大幅跳变）→ snap 快速到位
    const dx = px - camera.position.x
    const dy = py - camera.position.y
    const dz = pz - camera.position.z
    const jumpDist = Math.sqrt(dx * dx + dy * dy + dz * dz)
    const lerpK = jumpDist > 4 ? 0.5 : 0.1 // 大跳变(硬切)时快速追，否则平滑缓动
    // 平滑跟随目标，营造电影感缓动
    camera.position.lerp(tmpTarget.set(px, py, pz), lerpK)
    // lookAt 同步阻尼（与 pos 同 lerpK），消除硬切时朝向与位移不同步
    currentLook.current.lerp(tmpTarget.set(lx, ly, lz), lerpK)
    camera.lookAt(currentLook.current)
    const cam = camera as THREE.PerspectiveCamera
    if (Math.abs(cam.fov - s.camera.fov) > 0.01) {
      cam.fov = s.camera.fov
      cam.updateProjectionMatrix()
    }
  })

  return null
}
