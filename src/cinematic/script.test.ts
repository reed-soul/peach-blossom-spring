import { describe, it, expect } from 'vitest'
import { Director } from './Director'
import { ACTS } from './script'

describe('script', () => {
  it('所有幕的 beats 合法，Director 可构造', () => {
    expect(() => new Director(ACTS)).not.toThrow()
  })

  it('总时长在 3~7 分钟之间（课堂讲解适宜）', () => {
    const d = new Director(ACTS)
    const min = d.totalDuration / 60
    expect(min).toBeGreaterThan(2.5)
    expect(min).toBeLessThan(7)
  })

  it('每一拍都有 camera 和 caption', () => {
    for (const act of ACTS) {
      for (const b of act.beats) {
        expect(b.camera).toBeDefined()
        expect(b.caption).toBeTruthy()
      }
    }
  })

  it('每一拍的 camera.pos / lookAt 是合法三元组', () => {
    for (const act of ACTS) {
      for (const b of act.beats) {
        expect(b.camera.pos).toHaveLength(3)
        expect(b.camera.lookAt).toHaveLength(3)
        b.camera.pos.forEach((n) => expect(typeof n).toBe('number'))
      }
    }
  })
})
