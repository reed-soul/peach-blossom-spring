import { useRef, useEffect, useState, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { Director } from './Director'
import type { Act, DirectorState } from './types'

export interface DirectorHandle {
  start: () => void
  restart: () => void
  stateRef: React.MutableRefObject<DirectorState>
  hasStarted: boolean
}

export function useDirector(acts: Act[]): DirectorHandle {
  const directorRef = useRef<Director>(new Director(acts))
  const startTimeRef = useRef<number | null>(null)
  const stateRef = useRef<DirectorState>(directorRef.current.sample(0))
  const [hasStarted, setHasStarted] = useState(false)

  const start = useCallback(() => {
    startTimeRef.current = performance.now() / 1000
    setHasStarted(true)
  }, [])

  const restart = useCallback(() => {
    startTimeRef.current = performance.now() / 1000
    setHasStarted(true)
  }, [])

  useFrame(() => {
    if (startTimeRef.current == null) return
    const now = performance.now() / 1000
    const t = now - startTimeRef.current
    const d = directorRef.current
    stateRef.current = d.sample(t)
  })

  useEffect(() => () => { startTimeRef.current = null }, [])

  return { start, restart, stateRef, hasStarted }
}
