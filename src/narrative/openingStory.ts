import openingInk from './opening.json'
import { loadInkStory, readKnotText } from './inkRuntime'

export function getOpeningText(): string {
  const story = loadInkStory(openingInk as object)
  return readKnotText(story, 'opening')
}
