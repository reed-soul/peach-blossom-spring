import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './useGameStore'

describe('useGameStore', () => {
  beforeEach(() => {
    useGameStore.getState().reset()
  })

  it('starts at menu with empty story state', () => {
    const state = useGameStore.getState()
    expect(state.currentScene).toBe('menu')
    expect(state.storyState.visitedNPCs).toEqual([])
    expect(state.storyState.currentEnding).toBeNull()
  })

  it('tracks visited NPCs without duplicates', () => {
    const { visitNPC } = useGameStore.getState()
    visitNPC('老翁')
    visitNPC('老翁')
    visitNPC('渔女')
    expect(useGameStore.getState().storyState.visitedNPCs).toEqual(['老翁', '渔女'])
  })

  it('records ending choice', () => {
    useGameStore.getState().setEnding('return')
    expect(useGameStore.getState().storyState.currentEnding).toBe('return')
  })

  it('reset restores initial state', () => {
    useGameStore.getState().setScene('village')
    useGameStore.getState().setEnding('stay')
    useGameStore.getState().reset()
    const state = useGameStore.getState()
    expect(state.currentScene).toBe('menu')
    expect(state.storyState.currentEnding).toBeNull()
  })
})
