import { useEffect, useRef, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface PlayerControllerProps {
  speed?: number
  sprintSpeed?: number
}

export function PlayerController({ speed = 5, sprintSpeed = 8 }: PlayerControllerProps) {
  const { camera, gl } = useThree()
  const keys = useRef<Set<string>>(new Set())
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
  const bobPhase = useRef(0)
  const isMoving = useRef(false)

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!document.pointerLockElement) return
    euler.current.setFromQuaternion(camera.quaternion)
    euler.current.y -= e.movementX * 0.002
    euler.current.x -= e.movementY * 0.002
    euler.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.current.x))
    camera.quaternion.setFromEuler(euler.current)
  }, [camera])

  const onClick = useCallback(() => {
    if (!document.pointerLockElement) {
      gl.domElement.requestPointerLock?.()
    }
  }, [gl])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => keys.current.add(e.code)
    const onKeyUp = (e: KeyboardEvent) => keys.current.delete(e.code)

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    document.addEventListener('mousemove', onMouseMove)
    gl.domElement.addEventListener('click', onClick)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      document.removeEventListener('mousemove', onMouseMove)
      gl.domElement.removeEventListener('click', onClick)
      document.exitPointerLock?.()
    }
  }, [camera, gl, onMouseMove, onClick])

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

    isMoving.current = move.length() > 0

    if (isMoving.current) {
      move.normalize().multiplyScalar(spd * delta)
      camera.position.add(move)

      // Head bob
      const bobSpeed = sprinting ? 12 : 8
      bobPhase.current += delta * bobSpeed
      const bobY = Math.sin(bobPhase.current) * 0.06
      const bobX = Math.cos(bobPhase.current * 0.5) * 0.02
      camera.position.y = 1.5 + bobY
      camera.rotation.z = bobX * 0.03
    } else {
      // Smooth return to neutral
      bobPhase.current = 0
      camera.position.y += (1.5 - camera.position.y) * 0.1
      camera.rotation.z *= 0.9
    }
  })

  return null
}
