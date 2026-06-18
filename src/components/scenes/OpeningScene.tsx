import { useState, useEffect, useMemo } from 'react'
import { advanceScene } from '../../engine/navigation'
import { getOpeningText } from '../../narrative/openingStory'

export default function OpeningScene() {
  const text = useMemo(() => getOpeningText(), [])
  const [displayed, setDisplayed] = useState('')
  const [started, setStarted] = useState(false)

  useEffect(() => {
    if (!started) return
    let i = 0
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1))
        i++
      } else {
        clearInterval(timer)
        setTimeout(advanceScene, 2000)
      }
    }, 120)
    return () => clearInterval(timer)
  }, [started, text])

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), 1000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="w-full h-full flex items-center justify-center relative cursor-pointer"
      style={{
        background: 'radial-gradient(ellipse at 50% 40%, #1a1520 0%, #0d0a0f 60%, #050305 100%)',
      }}
      onClick={() => {
        if (displayed.length < text.length) {
          setDisplayed(text)
        } else {
          advanceScene()
        }
      }}
    >
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${20 + Math.random() * 60}px`,
            height: `${10 + Math.random() * 20}px`,
            backgroundColor: 'rgba(212, 197, 169, 0.03)',
            filter: 'blur(10px)',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `mistDrift ${15 + Math.random() * 20}s linear infinite`,
            animationDelay: `${Math.random() * 10}s`,
          }}
        />
      ))}

      <div className="max-w-2xl px-8 z-10">
        <p
          className="text-2xl md:text-3xl leading-relaxed"
          style={{
            color: '#d4c5a9',
            textShadow: '0 0 20px rgba(212, 197, 169, 0.2)',
            letterSpacing: '0.08em',
            lineHeight: '2.2',
          }}
        >
          {displayed}
          {displayed.length < text.length && (
            <span className="inline-block w-0.5 h-6 ml-1 animate-pulse" style={{ backgroundColor: '#d4c5a9' }} />
          )}
        </p>
        {displayed.length >= text.length && (
          <p className="text-center mt-8 text-sm opacity-40" style={{ color: '#8b7355' }}>
            点击继续 →
          </p>
        )}
      </div>

      <style>{`
        @keyframes mistDrift {
          0% { transform: translateX(-100px); }
          100% { transform: translateX(calc(100vw + 100px)); }
        }
      `}</style>
    </div>
  )
}
