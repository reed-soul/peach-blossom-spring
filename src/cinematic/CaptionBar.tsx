import { useEffect, useState } from 'react'

export interface CaptionBarProps {
  caption: string | null
  title: string | null
}

export function CaptionBar({ caption, title }: CaptionBarProps) {
  const [typed, setTyped] = useState('')
  const [full, setFull] = useState('')

  useEffect(() => {
    if (!caption) {
      setTyped('')
      setFull('')
      return
    }
    setFull(caption)
    setTyped('')
    let i = 0
    const id = setInterval(() => {
      i++
      setTyped(caption.slice(0, i))
      if (i >= caption.length) clearInterval(id)
    }, 70)
    return () => clearInterval(id)
  }, [caption])

  return (
    <>
      {/* 幕间大标题 */}
      {title && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <h2
            className="text-4xl md:text-6xl"
            style={{
              color: '#e8dcc4',
              letterSpacing: '0.3em',
              textShadow:
                '0 0 30px rgba(0,0,0,0.85), 0 0 60px rgba(212,197,169,0.35)',
              opacity: 0.92,
              animation: 'cinematicTitleFade 2.4s ease-out',
            }}
          >
            {title}
          </h2>
        </div>
      )}

      {/* 字幕条 */}
      {full && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 pointer-events-none w-full max-w-3xl px-6">
          <div
            className="px-8 py-4 rounded-sm text-center"
            style={{
              backgroundColor: 'rgba(10, 8, 6, 0.74)',
              borderTop: '1px solid rgba(212,197,169,0.28)',
              borderBottom: '1px solid rgba(212,197,169,0.28)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <p
              className="text-xl md:text-2xl"
              style={{
                color: '#e8dcc4',
                letterSpacing: '0.08em',
                lineHeight: 1.9,
                textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                fontFamily: '"KaiTi","STKaiti","楷体",serif',
              }}
            >
              {typed}
              {typed.length < full.length && (
                <span className="animate-pulse">▌</span>
              )}
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes cinematicTitleFade {
          0% { opacity: 0; transform: translateY(20px) scale(0.96); }
          30% { opacity: 0.92; transform: translateY(0) scale(1); }
          80% { opacity: 0.92; }
          100% { opacity: 0; }
        }
      `}</style>
    </>
  )
}
