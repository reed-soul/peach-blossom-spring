import { advanceScene } from '../../engine/SceneManager'
import { useGameStore } from '../../store/useGameStore'

export default function MainMenu() {
  const setScene = useGameStore((s) => s.setScene)
  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 50% 30%, #2c1810 0%, #1a0f0a 50%, #0a0a0a 100%)',
      }}>
      {/* Floating petals decoration */}
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full opacity-30"
          style={{
            width: `${6 + Math.random() * 10}px`,
            height: `${6 + Math.random() * 10}px`,
            backgroundColor: ['#FFB7C5', '#FFC0CB', '#FFE4E1', '#FFFFFF'][i % 4],
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `float ${5 + Math.random() * 10}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        />
      ))}

      {/* Title */}
      <h1
        className="text-6xl md:text-8xl font-bold mb-4 z-10"
        style={{
          color: '#d4c5a9',
          textShadow: '0 0 40px rgba(212, 197, 169, 0.3)',
          letterSpacing: '0.3em',
        }}
      >
        桃花源记
      </h1>

      <p
        className="text-lg md:text-xl mb-12 z-10 opacity-60"
        style={{ color: '#8b7355', letterSpacing: '0.1em' }}
      >
        互动沉浸式3D体验 · 电影讲解模式
      </p>

      <div className="z-10 flex flex-col items-center gap-4">
        {/* 主推：电影讲解（课堂演示用） */}
        <button
          onClick={() => setScene('cinematic')}
          className="px-12 py-4 text-xl rounded-sm border transition-all duration-500 hover:scale-105 cursor-pointer"
          style={{
            color: '#e8dcc4',
            borderColor: '#a67c3a',
            backgroundColor: 'rgba(166, 124, 58, 0.2)',
            letterSpacing: '0.2em',
            boxShadow: '0 0 28px rgba(166,124,58,0.18)',
          }}
        >
          ▶ 开启讲解（电影模式）
        </button>
        <p className="text-xs opacity-50" style={{ color: '#8b7355', letterSpacing: '0.1em' }}>
          点击后自动播放，全程无需操作
        </p>

        {/* 次选：自由探索 */}
        <button
          onClick={advanceScene}
          className="mt-2 px-10 py-3 text-base rounded-sm border transition-all duration-500 hover:scale-105 cursor-pointer"
          style={{
            color: '#d4c5a9',
            borderColor: '#5D4037',
            backgroundColor: 'rgba(93, 64, 55, 0.12)',
            letterSpacing: '0.2em',
          }}
        >
          进入桃花源（自由探索）
        </button>
      </div>

      <p className="absolute bottom-8 text-sm opacity-30 z-10" style={{ color: '#8b7355' }}>
        基于 Web3D · Three.js · React
      </p>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.3; }
          50% { transform: translateY(-30px) rotate(180deg); opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}
