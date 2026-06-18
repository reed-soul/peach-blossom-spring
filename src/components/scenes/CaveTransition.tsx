import { useEffect, useState } from 'react'
import { advanceScene } from '../../engine/navigation'

export default function CaveTransition() {
  const [phase, setPhase] = useState(0) // 0: darkening, 1: tunnel, 2: light, 3: transition

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2500),
      setTimeout(() => setPhase(3), 4000),
      setTimeout(advanceScene, 5500),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div
      className="w-full h-full flex items-center justify-center transition-all duration-[2000ms]"
      style={{
        background: phase < 2
          ? `rgba(5, 5, 5, ${0.9 + phase * 0.05})`
          : phase === 2
            ? 'radial-gradient(ellipse at 50% 50%, rgba(255,240,200,0.8) 0%, rgba(255,200,150,0.3) 40%, rgba(5,5,5,0.9) 70%)'
            : '#ffffff',
      }}
    >
      {phase === 1 && (
        <p className="text-xl opacity-60 animate-pulse" style={{ color: '#8b7355', letterSpacing: '0.3em' }}>
          穿越山洞…
        </p>
      )}
      {phase === 2 && (
        <div className="text-center">
          <p className="text-3xl mb-2" style={{ color: '#ffd700', letterSpacing: '0.2em' }}>
            豁然开朗
          </p>
          <p className="text-sm opacity-60" style={{ color: '#5d4037' }}>
            土地平旷，屋舍俨然，有良田美池桑竹之属
          </p>
        </div>
      )}
    </div>
  )
}
