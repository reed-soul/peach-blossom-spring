import { Story } from 'inkjs'
import { useGameStore } from '../store/useGameStore'
import villageInk from './village.json'

export type NpcKnot = 'laoweng' | 'yunv' | 'shusheng' | 'tongzi'

const KNOT_BY_NPC: Record<string, NpcKnot> = {
  老翁: 'laoweng',
  渔女: 'yunv',
  书生: 'shusheng',
  童子: 'tongzi',
}

export interface DialogueStep {
  text: string
  choices: { index: number; text: string }[]
  done: boolean
  hasEnding: boolean
}

function bindExternals(story: Story) {
  story.BindExternalFunction('visit_npc', (name: string) => {
    useGameStore.getState().visitNPC(name)
  })
  story.BindExternalFunction('record_choice', (choice: string) => {
    useGameStore.getState().addChoice(choice)
  })
  story.BindExternalFunction('set_ending', (ending: string) => {
    useGameStore.getState().setEnding(ending)
  })
  story.BindExternalFunction('mark_arc_complete', (name: string) => {
    useGameStore.getState().completeArc(name)
  })
}

export function createVillageStory(): Story {
  const story = new Story(villageInk as object)
  bindExternals(story)
  return story
}

export function interactWithNpc(story: Story, npcName: string): DialogueStep {
  const knot = KNOT_BY_NPC[npcName]
  if (!knot) return { text: '', choices: [], done: true, hasEnding: false }

  story.ChoosePathString(knot)
  return readStoryStep(story)
}

export function readFinalChoice(story: Story): DialogueStep {
  story.ChoosePathString('final_choice')
  return readStoryStep(story)
}

export function chooseOption(story: Story, index: number): DialogueStep {
  story.ChooseChoiceIndex(index)
  return readStoryStep(story)
}

function readStoryStep(story: Story): DialogueStep {
  let text = ''
  while (story.canContinue) {
    text += story.Continue()
  }

  const choices = story.currentChoices.map((c, index) => ({
    index,
    text: c.text,
  }))

  const ending = useGameStore.getState().storyState.currentEnding

  return {
    text: text.trim(),
    choices,
    done: !story.canContinue && choices.length === 0,
    hasEnding: ending !== null,
  }
}

export function getCompletedArcCount(): number {
  return useGameStore.getState().storyState.completedArcs.length
}

export { KNOT_BY_NPC }
