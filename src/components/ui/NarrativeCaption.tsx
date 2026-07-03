import { useEffect, useState } from 'react'

interface NarrativeCaptionProps {
  text: string
  visible: boolean
  duration?: number
}

export function NarrativeCaption({ text, visible, duration = 5000 }: NarrativeCaptionProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!visible || !text) {
      setShow(false)
      return
    }
    setShow(true)
    const timer = setTimeout(() => setShow(false), duration)
    return () => clearTimeout(timer)
  }, [visible, text, duration])

  if (!show) return null

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none max-w-lg px-6">
      <div
        className="px-6 py-3 rounded-sm text-center animate-pulse"
        style={{
          backgroundColor: 'rgba(26, 15, 10, 0.75)',
          border: '1px solid rgba(93, 64, 55, 0.5)',
          color: '#d4c5a9',
          letterSpacing: '0.12em',
          fontSize: '0.95rem',
          lineHeight: 1.8,
        }}
      >
        {text}
      </div>
    </div>
  )
}
