import { useFrame, useThree } from '@react-three/fiber'
import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three/webgpu'

export function DayNightCycle({ speed = 0.02 }: { speed?: number }) {
  const dirLightRef = useRef<THREE.DirectionalLight>(null)
  const ambLightRef = useRef<THREE.AmbientLight>(null)
  const hemiRef = useRef<THREE.HemisphereLight>(null)
  const timeRef = useRef(0.3) // 0-1, start at morning
  const { scene } = useThree()

  // Color palettes for different times
  const timeColors = {
    dawn: { sky: '#4a3060', fog: '#5a4070', sun: 0xffd4a6, amb: 0x8877aa, ambI: 0.3, sunI: 0.8, sunPos: [40, 10, 20] as [number,number,number] },
    morning: { sky: '#8899bb', fog: '#3d1f2f', sun: 0xfff0e0, amb: 0xffd4a6, ambI: 0.35, sunI: 1.2, sunPos: [30, 40, 20] as [number,number,number] },
    noon: { sky: '#aabbdd', fog: '#d4c0b0', sun: 0xfffff0, amb: 0xfff5e6, ambI: 0.5, sunI: 1.5, sunPos: [0, 60, 0] as [number,number,number] },
    afternoon: { sky: '#8899bb', fog: '#3d1f2f', sun: 0xffe0b0, amb: 0xffd4a6, ambI: 0.4, sunI: 1.0, sunPos: [-30, 35, 20] as [number,number,number] },
    dusk: { sky: '#6a3050', fog: '#5a2040', sun: 0xff8866, amb: 0x8866aa, ambI: 0.25, sunI: 0.6, sunPos: [-50, 8, 20] as [number,number,number] },
    night: { sky: '#0a0a1a', fog: '#0a0a15', sun: 0x4466aa, amb: 0x223355, ambI: 0.15, sunI: 0.2, sunPos: [0, -20, 0] as [number,number,number] },
  }

  const lerpColor = (a: string, b: string, t: number) => {
    const ca = new THREE.Color(a)
    const cb = new THREE.Color(b)
    return ca.lerp(cb, t)
  }

  const getTimeConfig = (t: number) => {
    // t: 0=midnight, 0.25=dawn, 0.5=noon, 0.75=dusk
    const phases = [
      { at: 0, key: 'night' as const },
      { at: 0.2, key: 'dawn' as const },
      { at: 0.3, key: 'morning' as const },
      { at: 0.5, key: 'noon' as const },
      { at: 0.7, key: 'afternoon' as const },
      { at: 0.8, key: 'dusk' as const },
      { at: 0.9, key: 'night' as const },
      { at: 1.0, key: 'night' as const },
    ]
    let prev = phases[0], next = phases[1]
    for (let i = 0; i < phases.length - 1; i++) {
      if (t >= phases[i].at && t <= phases[i + 1].at) {
        prev = phases[i]
        next = phases[i + 1]
        break
      }
    }
    const segT = (t - prev.at) / (next.at - prev.at)
    const p = timeColors[prev.key], n = timeColors[next.key]
    return {
      sky: lerpColor(p.sky, n.sky, segT),
      fog: lerpColor(p.fog, n.fog, segT),
      sunColor: lerpColor('#' + new THREE.Color(p.sun).getHexString(), '#' + new THREE.Color(n.sun).getHexString(), segT),
      ambColor: lerpColor('#' + new THREE.Color(p.amb).getHexString(), '#' + new THREE.Color(n.amb).getHexString(), segT),
      ambI: p.ambI + (n.ambI - p.ambI) * segT,
      sunI: p.sunI + (n.sunI - p.sunI) * segT,
      sunPos: p.sunPos.map((v, i) => v + (n.sunPos[i] - v) * segT) as [number, number, number],
      isNight: t < 0.2 || t > 0.85,
    }
  }

  const fogRef = useRef<THREE.Fog | null>(null)

  useFrame((_, delta) => {
    timeRef.current = (timeRef.current + delta * speed) % 1
    const cfg = getTimeConfig(timeRef.current)

    if (dirLightRef.current) {
      dirLightRef.current.position.set(...cfg.sunPos)
      dirLightRef.current.color.copy(cfg.sunColor)
      dirLightRef.current.intensity = cfg.sunI
    }
    if (ambLightRef.current) {
      ambLightRef.current.color.copy(cfg.ambColor)
      ambLightRef.current.intensity = cfg.ambI
    }

    if (!fogRef.current) {
      fogRef.current = new THREE.Fog(cfg.fog, 10, 60)
      scene.fog = fogRef.current
    } else {
      fogRef.current.color.copy(cfg.fog)
    }

    if (!scene.background) {
      scene.background = new THREE.Color()
    }
    ;(scene.background as THREE.Color).copy(cfg.sky)
  })

  return (
    <>
      <directionalLight
        ref={dirLightRef}
        position={[30, 40, 20]}
        intensity={1.2}
        color={0xfff0e0}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={100}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      <ambientLight ref={ambLightRef} intensity={0.35} color={0xffd4a6} />
      <hemisphereLight ref={hemiRef} args={[0xffe4c4, 0x2d5a27, 0.3]} />
      <TimeIndicator timeRef={timeRef} />
    </>
  )
}

function TimeIndicator({ timeRef }: { timeRef: React.RefObject<number> }) {
  const [timeStr, setTimeStr] = useState('')
  const { scene } = useThree()

  const getTimeStr = (t: number) => {
    const hours = Math.floor(t * 24)
    const mins = Math.floor((t * 24 - hours) * 60)
    const period = hours >= 6 && hours < 18 ? '☀' : '🌙'
    return `${period} ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
  }

  useFrame(() => {
    if (timeRef.current) {
      setTimeStr(getTimeStr(timeRef.current))
    }
  })

  return null
}

// Export time string for HUD overlay
export function useTimeDisplay() {
  const [timeStr, setTimeStr] = useState('')
  const update = () => {
    // Poll from scene userData
    const el = document.getElementById('time-display')
    if (el) setTimeStr(el.textContent || '')
  }
  useEffect(() => {
    const id = setInterval(update, 500)
    return () => clearInterval(id)
  }, [])
  return timeStr
}
