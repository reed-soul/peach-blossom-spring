import { useEffect, useRef, useCallback, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, CapsuleCollider } from '@react-three/rapier'
import * as THREE from 'three'

interface PlayerControllerProps {
  speed?: number
  sprintSpeed?: number
  position?: [number, number, number]
}

// Touch joystick state shared between 3D and UI
export const touchInput = {
  moveX: 0,
  moveY: 0,
  lookX: 0,
  lookY: 0,
  active: false,
}

// The inner component that uses Rapier hooks (must be inside Physics)
function PlayerBody({ speed = 5, sprintSpeed = 8, position = [0, 3, 10] }: PlayerControllerProps) {
  const { camera, gl } = useThree()
  const rigidBody = useRef<any>(null)
  const keys = useRef<Set<string>>(new Set())
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
  const bobPhase = useRef(0)
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

  // Jump on space
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

    // Movement direction from camera facing (horizontal only)
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    forward.y = 0
    forward.normalize()
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
    right.y = 0
    right.normalize()

    const move = new THREE.Vector3()

    // Keyboard
    if (k.has('KeyW') || k.has('ArrowUp')) move.add(forward)
    if (k.has('KeyS') || k.has('ArrowDown')) move.sub(forward)
    if (k.has('KeyD') || k.has('ArrowRight')) move.add(right)
    if (k.has('KeyA') || k.has('ArrowLeft')) move.sub(right)

    // Touch
    if (touchInput.active) {
      move.add(forward.clone().multiplyScalar(-touchInput.moveY))
      move.add(right.clone().multiplyScalar(touchInput.moveX))
    }

    // Touch look
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
      // Apply velocity in movement direction
      const vel = rigidBody.current.linvel()
      const targetVelX = move.x * spd
      const targetVelZ = move.z * spd
      // Smooth velocity change (feels better than instant)
      rigidBody.current.setLinvel(
        { x: THREE.MathUtils.lerp(vel.x, targetVelX, 0.15), y: vel.y, z: THREE.MathUtils.lerp(vel.z, targetVelZ, 0.15) },
        true,
      )
    } else {
      // Friction when not moving
      const vel = rigidBody.current.linvel()
      rigidBody.current.setLinvel({ x: vel.x * 0.85, y: vel.y, z: vel.z * 0.85 }, true)
    }

    // Sync camera to rigid body position
    const bodyPos = rigidBody.current.translation()
    camera.position.set(bodyPos.x, bodyPos.y + 0.5, bodyPos.z)

    // Head bob
    if (isMoving.current && canJump.current) {
      const bobSpeed = sprinting ? 12 : 8
      bobPhase.current += delta * bobSpeed
      const bobY = Math.sin(bobPhase.current) * 0.06
      const bobX = Math.cos(bobPhase.current * 0.5) * 0.02
      camera.position.y += bobY
      camera.rotation.z = bobX * 0.03
    } else {
      bobPhase.current = 0
      camera.rotation.z *= 0.9
    }

    // Ground check via y-velocity (simple and reliable)
    const vel = rigidBody.current.linvel()
    canJump.current = Math.abs(vel.y) < 0.5 && bodyPos.y < 2

    // Prevent falling out of world
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

export function PlayerController(props: PlayerControllerProps) {
  return <PlayerBody {...props} />
}

// Mobile touch controls UI component
export function MobileControls({ onAction }: { onAction?: () => void }) {
  const [isMobile, setIsMobile] = useState(false)
  const moveTouchId = useRef<number | null>(null)
  const lookTouchId = useRef<number | null>(null)
  const moveStart = useRef({ x: 0, y: 0 })
  const lookLast = useRef({ x: 0, y: 0 })

  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  const handleMoveStart = (e: React.TouchEvent) => {
    e.preventDefault()
    const t = e.changedTouches[0]
    moveTouchId.current = t.identifier
    moveStart.current = { x: t.clientX, y: t.clientY }
    touchInput.active = true
  }

  const handleMoveMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i]
      if (t.identifier === moveTouchId.current) {
        const dx = (t.clientX - moveStart.current.x) / 50
        const dy = (t.clientY - moveStart.current.y) / 50
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len > 1) {
          touchInput.moveX = dx / len
          touchInput.moveY = dy / len
        } else {
          touchInput.moveX = dx
          touchInput.moveY = dy
        }
      }
    }
  }

  const handleMoveEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === moveTouchId.current) {
        moveTouchId.current = null
        touchInput.moveX = 0
        touchInput.moveY = 0
        touchInput.active = false
      }
    }
  }

  const handleLookStart = (e: React.TouchEvent) => {
    e.preventDefault()
    const t = e.changedTouches[0]
    lookTouchId.current = t.identifier
    lookLast.current = { x: t.clientX, y: t.clientY }
  }

  const handleLookMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i]
      if (t.identifier === lookTouchId.current) {
        touchInput.lookX = t.clientX - lookLast.current.x
        touchInput.lookY = t.clientY - lookLast.current.y
        lookLast.current = { x: t.clientX, y: t.clientY }
      }
    }
  }

  const handleLookEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchId.current) {
        lookTouchId.current = null
      }
    }
  }

  if (!isMobile) return null

  return (
    <>
      <div className="fixed bottom-8 left-8 z-50" style={{ touchAction: 'none' }}>
        <div
          className="w-32 h-32 rounded-full border-2 flex items-center justify-center"
          style={{ borderColor: 'rgba(212,197,169,0.3)', background: 'rgba(0,0,0,0.15)' }}
          onTouchStart={handleMoveStart}
          onTouchMove={handleMoveMove}
          onTouchEnd={handleMoveEnd}
        >
          <div
            className="w-12 h-12 rounded-full"
            style={{
              background: 'rgba(212,197,169,0.5)',
              transform: `translate(${touchInput.moveX * 30}px, ${touchInput.moveY * 30}px)`,
              transition: 'transform 0.05s',
            }}
          />
        </div>
      </div>

      <button
        className="fixed bottom-12 right-8 z-50 w-16 h-16 rounded-full border-2 text-lg font-bold"
        style={{ borderColor: 'rgba(212,197,169,0.4)', background: 'rgba(0,0,0,0.2)', color: 'rgba(212,197,169,0.8)' }}
        onTouchStart={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })) }}
        onTouchEnd={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' })) }}
      >
        互动
      </button>

      <div
        className="fixed top-0 right-0 z-40"
        style={{ width: '50%', height: '60%', touchAction: 'none' }}
        onTouchStart={handleLookStart}
        onTouchMove={handleLookMove}
        onTouchEnd={handleLookEnd}
      />
    </>
  )
}
