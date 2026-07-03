import { useMemo } from 'react'
import { useGameStore } from '../../store/useGameStore'
import { goToMenu } from '../../engine/navigation'
import { resolveEndingContent } from '../../narrative/endingStory'

export default function EndingScene() {
  const { storyState } = useGameStore()
  const isReturn = storyState.currentEnding === 'return'
  const content = useMemo(
    () => resolveEndingContent(),
    [storyState.currentEnding, storyState.choicesMade, storyState.visitedNPCs, storyState.completedArcs],
  )

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: isReturn
          ? 'radial-gradient(ellipse at 50% 50%, #1a1520 0%, #050305 100%)'
          : 'radial-gradient(ellipse at 50% 30%, #2a1a2a 0%, #1a2030 50%, #0d0a0f 100%)',
      }}
    >
      {!isReturn &&
        Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-40"
            style={{
              width: `${4 + Math.random() * 12}px`,
              height: `${4 + Math.random() * 12}px`,
              backgroundColor: ['#FFB7C5', '#FFC0CB', '#FFE4E1'][i % 3],
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${5 + Math.random() * 10}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}

      <div className="text-center max-w-lg px-8 z-10">
        <h2 className="text-4xl mb-8" style={{ color: isReturn ? '#8b7355' : '#d4c5a9', letterSpacing: '0.15em' }}>
          {content.title}
        </h2>
        <p className="text-xl leading-relaxed mb-6" style={{ color: '#d4c5a9', lineHeight: '2.2' }}>
          {content.quote}
        </p>
        {content.memories.length > 0 && (
          <div className="mb-6 space-y-2">
            {content.memories.map((memory, i) => (
              <p key={i} className="text-sm italic" style={{ color: '#8b7355', lineHeight: '1.9', opacity: 0.75 }}>
                {memory}
              </p>
            ))}
          </div>
        )}
        <p className="text-lg leading-relaxed mb-12" style={{ color: '#8b7355', lineHeight: '2', opacity: 0.7 }}>
          {content.body}
        </p>
        <p className="text-sm opacity-40" style={{ color: '#5d4037' }}>
          {content.footer}
        </p>
      </div>

      <button
        onClick={goToMenu}
        className="absolute bottom-8 z-10 px-8 py-3 rounded-sm border cursor-pointer transition-all hover:scale-105"
        style={{ borderColor: '#5d4037', color: '#8b7355', backgroundColor: 'rgba(93, 64, 55, 0.1)' }}
      >
        重新开始
      </button>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
      `}</style>
    </div>
  )
}
