import { describe, it, expect } from 'vitest'
import { getOpeningText } from './openingStory'

describe('openingStory', () => {
  it('loads opening passage from ink', () => {
    const text = getOpeningText()
    expect(text).toContain('晋太元中')
    expect(text).toContain('桃花林')
  })
})
