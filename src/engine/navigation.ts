import { useGameStore, type SceneName } from '../store/useGameStore'

const SCENE_ORDER: SceneName[] = ['menu', 'opening', 'forest', 'cave', 'village', 'epilogue', 'ending']

type NavigateFn = (scene: SceneName) => void

let navigateFn: NavigateFn | null = null

export function registerNavigator(fn: NavigateFn) {
  navigateFn = fn
}

export function unregisterNavigator() {
  navigateFn = null
}

export function navigateTo(scene: SceneName) {
  navigateFn?.(scene)
}

export function advanceScene() {
  const { currentScene } = useGameStore.getState()
  const idx = SCENE_ORDER.indexOf(currentScene)
  if (idx >= 0 && idx < SCENE_ORDER.length - 1) {
    navigateTo(SCENE_ORDER[idx + 1])
  }
}

export function advanceFromVillage() {
  const ending = useGameStore.getState().storyState.currentEnding
  navigateTo(ending === 'return' ? 'epilogue' : 'ending')
}

export function goToMenu() {
  useGameStore.getState().reset()
  navigateTo('menu')
}

export { SCENE_ORDER }
