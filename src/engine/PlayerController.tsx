import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { PlayerBodyProps } from './PlayerBody'

export const touchInput = {
  moveX: 0,
  moveY: 0,
  lookX: 0,
  lookY: 0,
  active: false,
}

const LazyPlayerBody = lazy(() =>
  import('./PlayerBody').then((mod) => ({ default: mod.PlayerBody })),
)

export function PlayerController(props: PlayerBodyProps) {
  return (
    <Suspense fallback={null}>
      <LazyPlayerBody {...props} />
    </Suspense>
  )
}

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
