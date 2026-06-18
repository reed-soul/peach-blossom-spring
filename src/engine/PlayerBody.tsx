import { useEffect, useRef, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, CapsuleCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { touchInput } from './PlayerController'
import { playFootstep } from './footstep'

export interface PlayerBodyProps {
  speed?: number
  sprintSpeed?: number
  position?: [number, number, number]
}

export function PlayerBody({ speed = 5, sprintSpeed = 8, position = [0, 3, 10] }: PlayerBodyProps) {
  const { camera, gl } = useThree()
  const rigidBody = useRef<any>(null)
  const keys = useRef<Set<string>>(new Set())
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
  const bobPhase = useRef(0)
  const prevBobSin = useRef(0)
  const isMoving = useRef(false)
  const isTouchDevice = useRef('ontouchstart' in window)
  const canJump = useRef(false)

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!document.pointerLockElement) return
    euler.current.setFromQuaternion(camera.quaternion)
    euler.current.y -= e.movementX * 0.002
    euler.current.x -= e.movementY * 0.002
    euler.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.current.x))
    camera.quaternion.setFromEuler(euler.current)
  }, [camera])

  const onClick = useCallback(() => {
    if (isTouchDevice.current) return
    if (!document.pointerLockElement) {
      gl.domElement.requestPointerLock?.()
    }
  }, [gl])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keys.current.add(e.code)
      if (e.code === 'Space' && canJump.current && rigidBody.current) {
        rigidBody.current.applyImpulse({ x: 0, y: 5, z: 0 }, true)
        canJump.current = false
      }
    }
    const onKeyUp = (e: KeyboardEvent) => keys.current.delete(e.code)

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    if (!isTouchDevice.current) {
      document.addEventListener('mousemove', onMouseMove)
      gl.domElement.addEventListener('click', onClick)
    }

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      document.removeEventListener('mousemove', onMouseMove)
      gl.domElement.removeEventListener('click', onClick)
      document.exitPointerLock?.()
    }
  }, [camera, gl, onMouseMove, onClick])

  useFrame((_, delta) => {
    if (!rigidBody.current) return

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

    if (touchInput.active) {
      move.add(forward.clone().multiplyScalar(-touchInput.moveY))
      move.add(right.clone().multiplyScalar(touchInput.moveX))
    }

    if (touchInput.lookX !== 0 || touchInput.lookY !== 0) {
      euler.current.setFromQuaternion(camera.quaternion)
      euler.current.y -= touchInput.lookX * 0.003
      euler.current.x -= touchInput.lookY * 0.003
      euler.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.current.x))
      camera.quaternion.setFromEuler(euler.current)
      touchInput.lookX = 0
      touchInput.lookY = 0
    }

    isMoving.current = move.length() > 0

    if (isMoving.current) {
      move.normalize()
      const vel = rigidBody.current.linvel()
      const targetVelX = move.x * spd
      const targetVelZ = move.z * spd
      rigidBody.current.setLinvel(
        { x: THREE.MathUtils.lerp(vel.x, targetVelX, 0.15), y: vel.y, z: THREE.MathUtils.lerp(vel.z, targetVelZ, 0.15) },
        true,
      )
    } else {
      const vel = rigidBody.current.linvel()
      rigidBody.current.setLinvel({ x: vel.x * 0.85, y: vel.y, z: vel.z * 0.85 }, true)
    }

    const bodyPos = rigidBody.current.translation()
    camera.position.set(bodyPos.x, bodyPos.y + 0.5, bodyPos.z)

    if (isMoving.current && canJump.current) {
      const bobSpeed = sprinting ? 12 : 8
      bobPhase.current += delta * bobSpeed
      const sin = Math.sin(bobPhase.current)
      if (prevBobSin.current < 0 && sin >= 0) {
        playFootstep()
      }
      prevBobSin.current = sin
      const bobY = sin * 0.06
      const bobX = Math.cos(bobPhase.current * 0.5) * 0.02
      camera.position.y += bobY
      camera.rotation.z = bobX * 0.03
    } else {
      bobPhase.current = 0
      prevBobSin.current = 0
      camera.rotation.z *= 0.9
    }

    const vel = rigidBody.current.linvel()
    canJump.current = Math.abs(vel.y) < 0.5 && bodyPos.y < 2

    if (bodyPos.y < -10) {
      rigidBody.current.setTranslation({ x: 0, y: 3, z: 10 }, true)
      rigidBody.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
    }
  })

  return (
    <RigidBody
      ref={rigidBody}
      position={position}
      linearDamping={2}
      mass={1}
      type="dynamic"
      lockRotations
    >
      <CapsuleCollider args={[0.35, 0.35]} position={[0, 0.7, 0]} />
    </RigidBody>
  )
}
