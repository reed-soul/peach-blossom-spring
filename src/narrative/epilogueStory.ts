import epilogueInk from './epilogue.json'
import { loadInkStory, readKnotText } from './inkRuntime'

export function getEpilogueLines(): string[] {
  const story = loadInkStory(epilogueInk as object)
  return ['line_1', 'line_2', 'line_3'].map((k) => readKnotText(story, k))
}

export function getEpilogueClosing(): string {
  const story = loadInkStory(epilogueInk as object)
  return readKnotText(story, 'closing')
}
