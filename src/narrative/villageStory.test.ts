import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '../store/useGameStore'
import { createVillageStory, interactWithNpc, chooseOption } from './villageStory'

describe('villageStory', () => {
  beforeEach(() => {
    useGameStore.getState().reset()
  })

  it('loads ink story and returns first NPC line', () => {
    const story = createVillageStory()
    const step = interactWithNpc(story, '老翁')
    expect(step.text).toContain('隐居')
    expect(step.choices).toHaveLength(0)
    expect(useGameStore.getState().storyState.visitedNPCs).toContain('老翁')
  })

  it('advances NPC dialogue across visits', () => {
    const story = createVillageStory()
    interactWithNpc(story, '渔女')
    const second = interactWithNpc(story, '渔女')
    expect(second.text).toContain('年月')
  })

  it('records ending when player chooses to return', () => {
    const story = createVillageStory()
    interactWithNpc(story, '老翁')
    interactWithNpc(story, '老翁')
    const third = interactWithNpc(story, '老翁')
    expect(third.choices.length).toBeGreaterThan(0)
    const result = chooseOption(story, 1)
    expect(useGameStore.getState().storyState.currentEnding).toBe('return')
    expect(result.hasEnding).toBe(true)
  })
})
