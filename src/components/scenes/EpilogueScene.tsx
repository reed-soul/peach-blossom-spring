import { useEffect, useState } from 'react'
import { advanceScene } from '../../engine/navigation'

const LINES = [
  '便扶向路，处处志之。',
  '及郡下，诣太守，说如此。',
  '太守即遣人随其往，寻向所志，遂迷，不复得路。',
]

export default function EpilogueScene() {
  const [lineIndex, setLineIndex] = useState(0)
  const [displayed, setDisplayed] = useState('')

  useEffect(() => {
    if (lineIndex >= LINES.length) {
      const t = setTimeout(advanceScene, 2500)
      return () => clearTimeout(t)
    }

    const line = LINES[lineIndex]
    let i = 0
    setDisplayed('')
    const timer = setInterval(() => {
      if (i < line.length) {
        setDisplayed(line.slice(0, i + 1))
        i++
      } else {
        clearInterval(timer)
      }
    }, 80)

    const pause = setTimeout(() => setLineIndex((n) => n + 1), line.length * 80 + 1600)

    return () => {
      clearInterval(timer)
      clearTimeout(pause)
    }
  }, [lineIndex])

  const skip = () => {
    if (lineIndex < LINES.length - 1) {
      setLineIndex(LINES.length)
      setDisplayed(LINES[LINES.length - 1])
    } else {
      advanceScene()
    }
  }

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center cursor-pointer"
      style={{
        background: 'radial-gradient(ellipse at 50% 40%, #1a1520 0%, #0d0a0f 60%, #050305 100%)',
      }}
      onClick={skip}
    >
      <p className="text-xs mb-8 opacity-40" style={{ color: '#8b7355', letterSpacing: '0.2em' }}>
        归途
      </p>
      <p
        className="text-2xl md:text-3xl max-w-xl px-8 text-center leading-relaxed"
        style={{ color: '#d4c5a9', letterSpacing: '0.08em', lineHeight: '2.2' }}
      >
        {displayed}
        {lineIndex < LINES.length && displayed.length < LINES[lineIndex]?.length && (
          <span className="inline-block w-0.5 h-6 ml-1 animate-pulse" style={{ backgroundColor: '#d4c5a9' }} />
        )}
      </p>
      {lineIndex >= LINES.length && (
        <p className="mt-8 text-sm opacity-30" style={{ color: '#5d4037' }}>
          桃花源，终究只存在于记忆之中…
        </p>
      )}
      <p className="absolute bottom-8 text-xs opacity-25" style={{ color: '#8b7355' }}>
        点击跳过
      </p>
    </div>
  )
}
