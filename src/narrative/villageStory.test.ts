import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '../store/useGameStore'
import {
  createVillageStory,
  interactWithNpc,
  chooseOption,
  readFinalChoice,
} from './villageStory'

describe('villageStory', () => {
  beforeEach(() => {
    useGameStore.getState().reset()
  })

  it('loads ink story and returns first NPC line', () => {
    const story = createVillageStory()
    const step = interactWithNpc(story, '老翁')
    expect(step.text).toContain('大乱')
    expect(step.choices).toHaveLength(0)
    expect(useGameStore.getState().storyState.visitedNPCs).toContain('老翁')
  })

  it('advances NPC dialogue across visits', () => {
    const story = createVillageStory()
    interactWithNpc(story, '渔女')
    const second = interactWithNpc(story, '渔女')
    expect(second.text).toContain('桃花林')
  })

  it('records attitude hint without ending on fourth visit', () => {
    const story = createVillageStory()
    interactWithNpc(story, '老翁')
    interactWithNpc(story, '老翁')
    interactWithNpc(story, '老翁')
    const fourth = interactWithNpc(story, '老翁')
    expect(fourth.choices.length).toBeGreaterThan(0)
    const result = chooseOption(story, 1)
    expect(useGameStore.getState().storyState.currentEnding).toBeNull()
    expect(useGameStore.getState().storyState.choicesMade).toContain('return_hint')
    expect(useGameStore.getState().storyState.completedArcs).toContain('老翁')
    expect(result.hasEnding).toBe(false)
  })

  it('sets ending only through final choice', () => {
    const story = createVillageStory()
    const finalStep = readFinalChoice(story)
    expect(finalStep.choices.length).toBe(2)
    const result = chooseOption(story, 1)
    expect(useGameStore.getState().storyState.currentEnding).toBe('return')
    expect(result.hasEnding).toBe(true)
  })
})
