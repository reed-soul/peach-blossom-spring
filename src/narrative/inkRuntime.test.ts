import { describe, it, expect } from 'vitest'
import { parseTaggedSections } from './inkRuntime'

describe('parseTaggedSections', () => {
  it('extracts title, quote, body, footer', () => {
    const raw = `[TITLE]后遂无问津者
[QUOTE]南阳刘子骥，高尚士也。
[BODY]你回到了尘世。
[FOOTER]桃花源，终究只存在于记忆之中。`
    expect(parseTaggedSections(raw)).toEqual({
      title: '后遂无问津者',
      quote: '南阳刘子骥，高尚士也。',
      body: '你回到了尘世。',
      footer: '桃花源，终究只存在于记忆之中。',
    })
  })
})
