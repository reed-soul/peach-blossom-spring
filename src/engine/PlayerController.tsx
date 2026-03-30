import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface PlayerControllerProps {
  speed?: number
  sprintSpeed?: number
}

export function PlayerController({ speed = 5, sprintSpeed = 8 }: PlayerControllerProps) {
  const { camera } = useThree()
  const keys = useRef<Set<string>>(new Set())
  const velocity = useRef(new THREE.Vector3())
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => keys.current.add(e.code)
    const onKeyUp = (e: KeyboardEvent) => keys.current.delete(e.code)
    const onMouseMove = (e: MouseEvent) => {
      euler.current.setFromQuaternion(camera.quaternion)
      euler.current.y -= e.movementX * 0.002
      euler.current.x -= e.movementY * 0.002
      euler.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.current.x))
      camera.quaternion.setFromEuler(euler.current)
    }
    const onClick = () => {
      document.body.requestPointerLock?.()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('click', onClick)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('click', onClick)
      document.exitPointerLock?.()
    }
  }, [camera])

  useFrame((_, delta) => {
    const k = keys.current
    const sprinting = k.has('ShiftLeft') || k.has('ShiftRight')
    const spd = sprinting ? sprintSpeed : speed

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    forward.y = 0
    forward.normalize()
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
    right.y = 0
    right.normalize()

    const move = new THREE.Vector3()
    if (k.has('KeyW') || k.has('ArrowUp')) move.add(forward)
    if (k.has('KeyS') || k.has('ArrowDown')) move.sub(forward)
    if (k.has('KeyD') || k.has('ArrowRight')) move.add(right)
    if (k.has('KeyA') || k.has('ArrowLeft')) move.sub(right)

    if (move.length() > 0) {
      move.normalize().multiplyScalar(spd * delta)
      camera.position.add(move)
    }

    // Keep player at ground level (y=1.5 eye height)
    camera.position.y = 1.5
  })

  return null
}
