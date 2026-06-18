import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '../store/useGameStore'
import { resolveEndingContent } from './endingStory'

describe('endingStory', () => {
  beforeEach(() => {
    useGameStore.getState().reset()
  })

  it('returns stay quiet ending by default', () => {
    useGameStore.getState().setEnding('stay')
    const content = resolveEndingContent()
    expect(content.title).toBe('此中人语云')
    expect(content.body).toContain('选择了留下')
  })

  it('returns reflective return ending when return_hint recorded', () => {
    useGameStore.getState().setEnding('return')
    useGameStore.getState().addChoice('return_hint')
    const content = resolveEndingContent()
    expect(content.body).toContain('村民的嘱托')
  })
})
