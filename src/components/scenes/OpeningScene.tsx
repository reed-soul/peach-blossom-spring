import { useState, useEffect } from 'react'
import { advanceScene } from '../../engine/SceneManager'

const TEXT = `晋太元中，武陵人捕鱼为业。缘溪行，忘路之远近。忽逢桃花林，夹岸数百步，中无杂树，芳草鲜美，落英缤纷。渔人甚异之，复前行，欲穷其林。`

export default function OpeningScene() {
  const [displayed, setDisplayed] = useState('')
  const [started, setStarted] = useState(false)

  useEffect(() => {
    if (!started) return
    let i = 0
    const timer = setInterval(() => {
      if (i < TEXT.length) {
        setDisplayed(TEXT.slice(0, i + 1))
        i++
      } else {
        clearInterval(timer)
        // Auto advance after 2 seconds
        setTimeout(advanceScene, 2000)
      }
    }, 120)
    return () => clearInterval(timer)
  }, [started])

  useEffect(() => {
    // Auto start after 1 second
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
        if (displayed.length < TEXT.length) {
          setDisplayed(TEXT)
        } else {
          advanceScene()
        }
      }}
    >
      {/* Mist particles */}
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

      {/* Text */}
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
          {displayed.length < TEXT.length && (
            <span className="inline-block w-0.5 h-6 ml-1 animate-pulse" style={{ backgroundColor: '#d4c5a9' }} />
          )}
        </p>
        {displayed.length >= TEXT.length && (
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
