import { Story } from 'inkjs'

export interface TaggedSections {
  title: string
  quote: string
  body: string
  footer: string
  memories: string[]
}

export function loadInkStory(json: object, bind?: (story: Story) => void): Story {
  const story = new Story(json)
  bind?.(story)
  return story
}

export function readKnotText(story: Story, knot: string): string {
  story.ChoosePathString(knot)
  let text = ''
  while (story.canContinue) {
    text += story.Continue()
  }
  return text.trim()
}

export function parseTaggedSections(raw: string): TaggedSections {
  const sections: Partial<TaggedSections> = { memories: [] }
  for (const line of raw.split('\n')) {
    const match = line.match(/^\[(\w+)\](.*)$/)
    if (!match) continue
    const key = match[1].toLowerCase()
    const value = match[2].trim()
    if (key === 'memory') {
      sections.memories!.push(value)
    } else if (key in { title: 1, quote: 1, body: 1, footer: 1 }) {
      sections[key as keyof Omit<TaggedSections, 'memories'>] = value
    }
  }
  return {
    title: sections.title ?? '',
    quote: sections.quote ?? '',
    body: sections.body ?? '',
    footer: sections.footer ?? '',
    memories: sections.memories ?? [],
  }
}

export function readTaggedKnot(story: Story, knot: string): TaggedSections {
  return parseTaggedSections(readKnotText(story, knot))
}
