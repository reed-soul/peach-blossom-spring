import { useGameStore } from '../../store/useGameStore'
import { advanceScene } from '../../engine/SceneManager'

export default function EndingScene() {
  const { storyState, reset } = useGameStore()
  const isReturn = storyState.currentEnding === 'return'

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: isReturn
          ? 'radial-gradient(ellipse at 50% 50%, #1a1520 0%, #050305 100%)'
          : 'radial-gradient(ellipse at 50% 30%, #2a1a2a 0%, #1a2030 50%, #0d0a0f 100%)',
      }}
    >
      {/* Decorative petals for "stay" ending */}
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

      {isReturn ? (
        <div className="text-center max-w-lg px-8 z-10">
          <h2 className="text-4xl mb-8" style={{ color: '#8b7355', letterSpacing: '0.15em' }}>
            既出，得其船
          </h2>
          <p className="text-xl leading-relaxed mb-6" style={{ color: '#d4c5a9', lineHeight: '2.2' }}>
            便扶向路，处处志之。及郡下，诣太守，说如此。太守即遣人随其往，寻向所志，遂迷，不复得路。
          </p>
          <p className="text-lg leading-relaxed mb-12" style={{ color: '#8b7355', lineHeight: '2', opacity: 0.6 }}>
            南阳刘子骥，高尚士也，闻之，欣然规往。未果，寻病终。后遂无问津者。
          </p>
          <p className="text-sm opacity-30" style={{ color: '#5d4037' }}>
            桃花源，终究只存在于记忆之中。
          </p>
        </div>
      ) : (
        <div className="text-center max-w-lg px-8 z-10">
          <h2 className="text-4xl mb-8" style={{ color: '#d4c5a9', letterSpacing: '0.15em' }}>
            此中人语云
          </h2>
          <p className="text-xl leading-relaxed mb-6" style={{ color: '#d4c5a9', lineHeight: '2.2' }}>
            不足为外人道也。
          </p>
          <p className="text-lg leading-relaxed mb-12" style={{ color: '#8b7355', lineHeight: '2', opacity: 0.7 }}>
            你选择了留下。在这里，日出而作，日落而息，与桃花为伴，与溪水为邻。
            没有纷争，没有忧愁，只有宁静与美好。
          </p>
          <p className="text-sm opacity-40" style={{ color: '#5d4037' }}>
            桃花源记 · 陶渊明
          </p>
        </div>
      )}

      <button
        onClick={() => { reset(); advanceScene() }}
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
