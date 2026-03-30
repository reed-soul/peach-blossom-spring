import { useEffect, useRef, useCallback, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface PlayerControllerProps {
  speed?: number
  sprintSpeed?: number
}

// Touch joystick state shared between 3D and UI
export const touchInput = {
  moveX: 0,
  moveY: 0,
  lookX: 0,
  lookY: 0,
  active: false,
}

export function PlayerController({ speed = 5, sprintSpeed = 8 }: PlayerControllerProps) {
  const { camera, gl } = useThree()
  const keys = useRef<Set<string>>(new Set())
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
  const bobPhase = useRef(0)
  const isMoving = useRef(false)
  const isTouchDevice = useRef('ontouchstart' in window)

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
    const onKeyDown = (e: KeyboardEvent) => keys.current.add(e.code)
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

    // Keyboard input
    if (k.has('KeyW') || k.has('ArrowUp')) move.add(forward)
    if (k.has('KeyS') || k.has('ArrowDown')) move.sub(forward)
    if (k.has('KeyD') || k.has('ArrowRight')) move.add(right)
    if (k.has('KeyA') || k.has('ArrowLeft')) move.sub(right)

    // Touch joystick input
    if (touchInput.active) {
      move.add(forward.clone().multiplyScalar(-touchInput.moveY))
      move.add(right.clone().multiplyScalar(touchInput.moveX))
    }

    // Touch look input
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
      move.normalize().multiplyScalar(spd * delta)
      camera.position.add(move)

      const bobSpeed = sprinting ? 12 : 8
      bobPhase.current += delta * bobSpeed
      const bobY = Math.sin(bobPhase.current) * 0.06
      const bobX = Math.cos(bobPhase.current * 0.5) * 0.02
      camera.position.y = 1.5 + bobY
      camera.rotation.z = bobX * 0.03
    } else {
      bobPhase.current = 0
      camera.position.y += (1.5 - camera.position.y) * 0.1
      camera.rotation.z *= 0.9
    }
  })

  return null
}

// Mobile touch controls UI component (render in HTML overlay)
export function MobileControls({ onAction }: { onAction?: () => void }) {
  const [isMobile, setIsMobile] = useState(false)
  const moveJoystick = useRef<HTMLDivElement>(null)
  const lookArea = useRef<HTMLDivElement>(null)
  const moveTouchId = useRef<number | null>(null)
  const lookTouchId = useRef<number | null>(null)
  const moveStart = useRef({ x: 0, y: 0 })

  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  // Move joystick
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

  // Look area (right side of screen)
  const lookLast = useRef({ x: 0, y: 0 })

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

  if (!isMobile) return null

  return (
    <>
      {/* Move joystick - bottom left */}
      <div
        ref={moveJoystick}
        className="fixed bottom-8 left-8 z-50"
        style={{ touchAction: 'none' }}
      >
        <div
          className="w-32 h-32 rounded-full border-2 flex items-center justify-center"
          style={{
            borderColor: 'rgba(212, 197, 169, 0.3)',
            background: 'rgba(0,0,0,0.15)',
          }}
          onTouchStart={handleMoveStart}
          onTouchMove={handleMoveMove}
          onTouchEnd={handleMoveEnd}
        >
          <div
            className="w-12 h-12 rounded-full"
            style={{
              background: 'rgba(212, 197, 169, 0.5)',
              transform: `translate(${touchInput.moveX * 30}px, ${touchInput.moveY * 30}px)`,
              transition: 'transform 0.05s',
            }}
          />
        </div>
      </div>

      {/* Action button - bottom right */}
      <button
        className="fixed bottom-12 right-8 z-50 w-16 h-16 rounded-full border-2 text-lg font-bold"
        style={{
          borderColor: 'rgba(212, 197, 169, 0.4)',
          background: 'rgba(0,0,0,0.2)',
          color: 'rgba(212, 197, 169, 0.8)',
        }}
        onTouchStart={(e) => {
          e.preventDefault()
          // Simulate E key press for interactions
          window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }))
        }}
        onTouchEnd={(e) => {
          e.preventDefault()
          window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' }))
        }}
      >
        互动
      </button>

      {/* Look area - right half of screen */}
      <div
        ref={lookArea}
        className="fixed top-0 right-0 z-40"
        style={{ width: '50%', height: '60%', touchAction: 'none' }}
        onTouchStart={handleLookStart}
        onTouchMove={handleLookMove}
        onTouchEnd={(e) => {
          for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === lookTouchId.current) {
              lookTouchId.current = null
            }
          }
        }}
      />
    </>
  )
}
