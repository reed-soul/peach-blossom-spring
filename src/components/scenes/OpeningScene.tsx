import { useState, useEffect, useMemo, useRef } from 'react'
import { advanceScene } from '../../engine/navigation'
import { getOpeningText } from '../../narrative/openingStory'

// 将开场文本按换行切成多段，逐段打字机播放，每段播完"点击继续"下一段
export default function OpeningScene() {
  const passages = useMemo(
    () => getOpeningText().split('\n').map((s) => s.trim()).filter((s) => s.length > 0),
    [],
  )
  const [passageIdx, setPassageIdx] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [started, setStarted] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const current = passages[passageIdx] ?? ''
  const isLast = passageIdx >= passages.length - 1

  useEffect(() => {
    if (!started) return
    let i = 0
    setDisplayed('')
    timerRef.current = setInterval(() => {
      if (i < current.length) {
        setDisplayed(current.slice(0, i + 1))
        i++
      } else {
        if (timerRef.current) clearInterval(timerRef.current)
        // 最后一段播完 → 2s 后自动进入森林
        if (isLast) {
          setTimeout(advanceScene, 2000)
        }
      }
    }, 120)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [started, current, isLast])

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), 1000)
    return () => clearTimeout(t)
  }, [])

  const handleClick = () => {
    if (displayed.length < current.length) {
      // 当前段未播完 → 点击补全
      setDisplayed(current)
      if (timerRef.current) clearInterval(timerRef.current)
    } else if (!isLast) {
      // 当前段已播完且非最后 → 进入下一段
      setPassageIdx((idx) => idx + 1)
    } else {
      // 最后一段播完 → 进入森林
      advanceScene()
    }
  }

  const passageDone = displayed.length >= current.length

  return (
    <div
      className="w-full h-full flex items-center justify-center relative cursor-pointer"
      style={{
        background: 'radial-gradient(ellipse at 50% 40%, #1a1520 0%, #0d0a0f 60%, #050305 100%)',
      }}
      onClick={handleClick}
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
        {/* 段落进度点 */}
        <div className="flex gap-2 justify-center mb-6">
          {passages.map((_, i) => (
            <span
              key={i}
              className="inline-block w-1.5 h-1.5 rounded-full transition-opacity duration-500"
              style={{
                backgroundColor: '#8b7355',
                opacity: i < passageIdx ? 0.6 : i === passageIdx ? 0.9 : 0.2,
              }}
            />
          ))}
        </div>

        <p
          className="text-2xl md:text-3xl leading-relaxed min-h-[3em]"
          style={{
            color: '#d4c5a9',
            textShadow: '0 0 20px rgba(212, 197, 169, 0.2)',
            letterSpacing: '0.08em',
            lineHeight: '2.2',
          }}
        >
          {displayed}
          {!passageDone && (
            <span className="inline-block w-0.5 h-6 ml-1 animate-pulse" style={{ backgroundColor: '#d4c5a9' }} />
          )}
        </p>
        {passageDone && (
          <p className="text-center mt-8 text-sm opacity-40" style={{ color: '#8b7355' }}>
            {isLast ? '点击进入桃花源 →' : '点击继续 →'}
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
