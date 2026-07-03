import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { advanceScene } from '../../engine/navigation'

const CAPTIONS = [
  { at: 0.5, text: '初极狭，才通人。' },
  { at: 3.5, text: '复行数十步，豁然开朗。' },
]

function TunnelWalkthrough({
  onDone,
  onCaption,
}: {
  onDone: () => void
  onCaption: (text: string) => void
}) {
  const progress = useRef(0)
  const shown = useRef(new Set<number>())

  useFrame((_, delta) => {
    progress.current = Math.min(progress.current + delta * 0.22, 1)
    const t = progress.current

    CAPTIONS.forEach((c, i) => {
      if (t >= c.at / 6 && !shown.current.has(i)) {
        shown.current.add(i)
        onCaption(c.text)
      }
    })

    if (t >= 1) onDone()
  })

  useFrame((state) => {
    const t = progress.current
    const cam = state.camera
    cam.position.set(Math.sin(t * 3) * 0.15, 1.6 + t * 0.4, -t * 14)
    cam.lookAt(0, 1.5 + t * 0.5, -t * 14 - 4)
    cam.fov = 50 + t * 18
    cam.updateProjectionMatrix()
  })

  return (
    <>
      <color attach="background" args={['#050505']} />
      <ambientLight intensity={0.08} />
      <pointLight position={[0, 2, -2]} color="#ffb86b" intensity={2} distance={12} />
      <pointLight position={[0, 3, -12]} color="#fff0d0" intensity={4} distance={20} />

      {Array.from({ length: 16 }).map((_, i) => (
        <group key={i} position={[0, 0, -i * 1.1]}>
          <mesh position={[-1.8, 1.5, 0]} castShadow>
            <boxGeometry args={[1.2, 3.5, 1]} />
            <meshStandardMaterial color={0x3e2723} roughness={1} />
          </mesh>
          <mesh position={[1.8, 1.5, 0]} castShadow>
            <boxGeometry args={[1.2, 3.5, 1]} />
            <meshStandardMaterial color={0x3e2723} roughness={1} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, 2, -14]}>
        <planeGeometry args={[10, 8]} />
        <meshBasicMaterial color="#fff8e8" transparent opacity={0.35} />
      </mesh>
    </>
  )
}

export default function CaveTransition() {
  const [phase, setPhase] = useState<'enter' | 'tunnel' | 'burst'>('enter')
  const [caption, setCaption] = useState('')
  const advanced = useRef(false)

  useEffect(() => {
    const t = setTimeout(() => setPhase('tunnel'), 600)
    return () => clearTimeout(t)
  }, [])

  const finish = () => {
    if (advanced.current) return
    advanced.current = true
    setPhase('burst')
    setTimeout(advanceScene, 1200)
  }

  return (
    <div className="w-full h-full relative" style={{ background: '#050505' }}>
      {phase === 'enter' && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <p className="text-xl opacity-60 animate-pulse" style={{ color: '#8b7355', letterSpacing: '0.3em' }}>
            舍船，从口入…
          </p>
        </div>
      )}

      {phase === 'tunnel' && (
        <>
          <Canvas camera={{ position: [0, 1.6, 0], fov: 50, near: 0.1, far: 50 }}>
            <TunnelWalkthrough onDone={finish} onCaption={setCaption} />
          </Canvas>
          {caption && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
              <p className="text-lg" style={{ color: '#d4c5a9', letterSpacing: '0.15em', textShadow: '0 0 12px #000' }}>
                {caption}
              </p>
            </div>
          )}
        </>
      )}

      {phase === 'burst' && (
        <div
          className="absolute inset-0 flex items-center justify-center transition-all duration-1000"
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(255,240,200,0.95) 0%, rgba(255,200,150,0.4) 40%, rgba(5,5,5,0.9) 75%)',
          }}
        >
          <div className="text-center z-10">
            <p className="text-3xl mb-2" style={{ color: '#ffd700', letterSpacing: '0.2em' }}>
              豁然开朗
            </p>
            <p className="text-sm opacity-70" style={{ color: '#5d4037' }}>
              土地平旷，屋舍俨然，有良田美池桑竹之属
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
