import { Story } from 'inkjs'
import { useGameStore } from '../store/useGameStore'
import endingsInk from './endings.json'
import { loadInkStory, parseTaggedSections, type TaggedSections } from './inkRuntime'

function bindEndingExternals(story: Story) {
  story.BindExternalFunction('visited_count', () => {
    return useGameStore.getState().storyState.visitedNPCs.length
  })
  story.BindExternalFunction('has_choice', (name: string) => {
    return useGameStore.getState().storyState.choicesMade.includes(name)
  })
}

export function resolveEndingContent(): TaggedSections {
  const { currentEnding } = useGameStore.getState().storyState
  const story = loadInkStory(endingsInk as object, bindEndingExternals)
  story.ChoosePathString(currentEnding === 'return' ? 'return_path' : 'stay')
  let raw = ''
  while (story.canContinue) {
    raw += story.Continue()
  }
  return parseTaggedSections(raw.trim())
}
