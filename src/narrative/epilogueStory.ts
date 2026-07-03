import { useGameStore } from '../store/useGameStore'
import epilogueInk from './epilogue.json'
import { loadInkStory, readKnotText } from './inkRuntime'

function resolveClosingKnot(): string {
  const { visitedNPCs } = useGameStore.getState().storyState
  if (visitedNPCs.includes('老翁') && visitedNPCs.includes('书生')) return 'closing_wise'
  if (visitedNPCs.includes('渔女')) return 'closing_peaceful'
  if (visitedNPCs.includes('童子')) return 'closing_child'
  return 'closing_default'
}

export function getEpilogueLines(): string[] {
  const story = loadInkStory(epilogueInk as object)
  return ['line_1', 'line_2', 'line_3'].map((k) => readKnotText(story, k))
}

export function getEpilogueClosing(): string {
  const story = loadInkStory(epilogueInk as object)
  return readKnotText(story, resolveClosingKnot())
}
