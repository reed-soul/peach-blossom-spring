import { lazy, Suspense, useEffect, useState, useCallback } from 'react'
import { useGameStore, type SceneName } from '../store/useGameStore'
import { registerNavigator, unregisterNavigator } from './navigation'

const scenes: Record<SceneName, React.LazyExoticComponent<React.ComponentType>> = {
  menu: lazy(() => import('../components/ui/MainMenu')),
  opening: lazy(() => import('../components/scenes/OpeningScene')),
  forest: lazy(() => import('../components/scenes/PeachForestScene')),
  cave: lazy(() => import('../components/scenes/CaveTransition')),
  village: lazy(() => import('../components/scenes/VillageScene')),
  epilogue: lazy(() => import('../components/scenes/EpilogueScene')),
  ending: lazy(() => import('../components/scenes/EndingScene')),
  cinematic: lazy(() => import('../cinematic/CinematicExperience')),
}

export function SceneManager() {
  const { currentScene, setScene, setTransition } = useGameStore()
  const [fade, setFade] = useState(false)
  const [visible, setVisible] = useState(true)

  const goTo = useCallback(
    (next: SceneName) => {
      if (next === currentScene) return
      setFade(true)
      setTransition(true)
      setTimeout(() => {
        setVisible(false)
        setScene(next)
        setVisible(true)
        setTimeout(() => {
          setFade(false)
          setTransition(false)
        }, 100)
      }, 800)
    },
    [currentScene, setScene, setTransition],
  )

  useEffect(() => {
    registerNavigator(goTo)
    return () => unregisterNavigator()
  }, [goTo])

  const SceneComponent = scenes[currentScene]

  return (
    <div className="w-full h-full relative">
      <div
        className="absolute inset-0 bg-black pointer-events-none z-50 transition-opacity duration-800"
        style={{ opacity: fade ? 1 : 0 }}
      />
      {visible && (
        <Suspense fallback={<div className="w-full h-full bg-black flex items-center justify-center"><p style={{color:'#d4c5a9'}}>加载中...</p></div>}>
          <SceneComponent />
        </Suspense>
      )}
    </div>
  )
}

export { advanceScene, navigateTo, goToMenu } from './navigation'
