import { describe, it, expect } from 'vitest'
import { Director } from './Director'
import type { Act, Beat } from './types'

function beat(at: number, duration: number, partial: Partial<Beat> = {}): Beat {
  return {
    at,
    duration,
    camera: { pos: [at, 0, 0], lookAt: [0, 0, 0], fov: 50 },
    ...partial,
  }
}

const ACTS: Act[] = [
  {
    name: 'a1',
    title: '第一幕',
    beats: [
      beat(0, 2, {
        caption: '甲',
        narration: 'n甲',
        actor: { pos: [0, 0, 0], facing: 0, action: 'idle' },
      }),
      beat(2, 3, {
        caption: '乙',
        sfx: 'chime',
        actor: { pos: [5, 0, 0], facing: 0, action: 'walk' },
      }),
    ],
  },
  {
    name: 'a2',
    title: '第二幕',
    beats: [beat(0, 1, { caption: '丙' }), beat(1, 1, { caption: '丁' })],
  },
]

describe('Director', () => {
  it('返回第一幕第一拍的初始状态', () => {
    const d = new Director(ACTS)
    const s = d.sample(0)
    expect(s.actIndex).toBe(0)
    expect(s.beatIndex).toBe(0)
    expect(s.beatProgress).toBe(0)
    expect(s.caption).toBe('甲')
    expect(s.title).toBe('第一幕')
  })

  it('在第一拍中途，progress 在 0..1 之间', () => {
    const d = new Director(ACTS)
    const s = d.sample(1)
    expect(s.beatProgress).toBeCloseTo(0.5, 5)
    expect(s.actIndex).toBe(0)
    expect(s.beatIndex).toBe(0)
  })

  it('进入第一拍时触发 narrationTrigger（仅切换瞬间）', () => {
    const d = new Director(ACTS)
    const s0 = d.sample(0)
    expect(s0.narrationTrigger).toBe('n甲')
    const s1 = d.sample(0.5)
    expect(s1.narrationTrigger).toBeNull() // 中途不再触发
  })

  it('第二拍开始触发 sfxTrigger', () => {
    const d = new Director(ACTS)
    const s = d.sample(2)
    expect(s.beatIndex).toBe(1)
    expect(s.sfxTrigger).toBe('chime')
  })

  it('相机在第一拍内 pos 保持该拍目标（t=0）', () => {
    const d = new Director(ACTS)
    const mid = d.sample(1)
    // beat0 的 camera.pos=[0,0,0]，prevBeat 为空，插值结果为 beat0 本身
    expect(mid.camera.pos[0]).toBe(0)
  })

  it('跨幕进入第二幕时 title 为新幕标题', () => {
    const d = new Director(ACTS)
    const s = d.sample(5) // act0 总长 5s
    expect(s.actIndex).toBe(1)
    expect(s.title).toBe('第二幕')
    expect(s.beatIndex).toBe(0)
  })

  it('超过总时长后 isFinished 为 true，状态停在最后一拍', () => {
    const d = new Director(ACTS)
    const s = d.sample(999)
    expect(d.isFinished).toBe(true)
    expect(s.actIndex).toBe(1)
    expect(s.beatIndex).toBe(1)
  })

  it('所有 beat 的 at+duration 单调递增且 act 内无重叠（非法应抛错）', () => {
    const bad: Act[] = {
      name: 'x',
      title: '坏',
      beats: [beat(0, 2), beat(1, 1)], // 第二拍 at=1 与第一拍重叠
    } as any
    expect(() => new Director(bad)).toThrow()
  })

  it('actor 默认值：未给 actor 的 beat 沿用前一拍的 actor 末态', () => {
    const d = new Director(ACTS)
    // act1 的 beats 没给 actor，应沿用 act0 末拍 actor 的末态
    const s = d.sample(5)
    expect(s.actor.pos[0]).toBe(5)
  })
})
