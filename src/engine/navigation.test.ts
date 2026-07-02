import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useGameStore } from '../store/useGameStore'
import {
  registerNavigator,
  unregisterNavigator,
  navigateTo,
  advanceScene,
  advanceFromVillage,
  goToMenu,
  SCENE_ORDER,
} from './navigation'

describe('navigation', () => {
  const navigated: string[] = []

  beforeEach(() => {
    navigated.length = 0
    useGameStore.getState().reset()
    registerNavigator((scene) => navigated.push(scene))
  })

  afterEach(() => {
    unregisterNavigator()
  })

  it('defines full scene order including epilogue', () => {
    expect(SCENE_ORDER).toEqual([
      'menu', 'opening', 'forest', 'cave', 'village', 'epilogue', 'ending',
    ])
  })

  it('advanceScene moves to next scene in order', () => {
    useGameStore.getState().setScene('opening')
    advanceScene()
    expect(navigated).toEqual(['forest'])
  })

  it('advanceFromVillage routes return ending through epilogue', () => {
    useGameStore.getState().setEnding('return')
    advanceFromVillage()
    expect(navigated).toEqual(['epilogue'])
  })

  it('advanceFromVillage routes stay ending directly to ending', () => {
    useGameStore.getState().setEnding('stay')
    advanceFromVillage()
    expect(navigated).toEqual(['ending'])
  })

  it('goToMenu resets and navigates to menu', () => {
    useGameStore.getState().setScene('ending')
    useGameStore.getState().setEnding('stay')
    goToMenu()
    expect(useGameStore.getState().currentScene).toBe('menu')
    expect(navigated).toEqual(['menu'])
  })

  it('navigateTo is no-op without registered navigator', () => {
    unregisterNavigator()
    navigateTo('forest')
    expect(navigated).toEqual([])
  })
})
