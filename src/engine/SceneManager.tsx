import { lazy, Suspense, useEffect, useState, useCallback } from 'react'
import { useGameStore, type SceneName } from '../store/useGameStore'

const SCENE_ORDER: SceneName[] = ['menu', 'opening', 'forest', 'cave', 'village', 'ending']

const scenes: Record<SceneName, React.LazyExoticComponent<React.ComponentType>> = {
  menu: lazy(() => import('../components/ui/MainMenu')),
  opening: lazy(() => import('../components/scenes/OpeningScene')),
  forest: lazy(() => import('../components/scenes/PeachForestScene')),
  cave: lazy(() => import('../components/scenes/CaveTransition')),
  village: lazy(() => import('../components/scenes/VillageScene')),
  ending: lazy(() => import('../components/scenes/EndingScene')),
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
    ;(window as any).__sceneGoTo = goTo
    return () => {
      delete (window as any).__sceneGoTo
    }
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

export function advanceScene() {
  const { currentScene } = useGameStore.getState()
  const idx = SCENE_ORDER.indexOf(currentScene)
  if (idx >= 0 && idx < SCENE_ORDER.length - 1) {
    const goTo = (window as any).__sceneGoTo
    if (goTo) goTo(SCENE_ORDER[idx + 1])
  }
}
