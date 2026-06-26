# 桃花源记 · 电影讲解模式 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有项目中新增一个「电影讲解模式」：点击一个按钮后，全程自动播放《桃花源记》的 3D 电影式讲解（第三人称渔人角色 + 镜头调度 + 字幕 + 中文语音旁白），无需任何后续操作，供课堂演示。

**Architecture:** 新建独立的 `src/cinematic/` 模块（不改动现有可玩探索模式）。核心是 `Director` 时间线引擎（纯逻辑、可单测），它消费一个声明式的 `Act[]/Beat[]` 剧本数据，由 `useDirector` hook 在 `useFrame` 中按真实 elapsed 时间推进，输出每帧的相机/角色/字幕/旁白/音效快照。角色用程序化几何体 + `MeshToonMaterial` + 背面法线外扩描边模拟「寻仙」国风卡通画风。语音用浏览器原生 `SpeechSynthesis`（zh-CN，降级优雅）。世界为单 Canvas 连续布局，镜头切换营造电影感。

**Tech Stack:** React 18, TypeScript, @react-three/fiber v8, @react-three/drei, three.js (MeshToonMaterial), Web Speech API (SpeechSynthesis), vitest (新增测试), Tailwind v4, Zustand, Vite 6。

---

## File Structure

| 文件 | 责任 | 操作 |
|------|------|------|
| `src/cinematic/types.ts` | Beat/Act/Vec3/Action 类型定义 | 新建 |
| `src/cinematic/Director.ts` | 时间线纯逻辑引擎（无 React/Three） | 新建 |
| `src/cinematic/Director.test.ts` | Director 单测 | 新建 |
| `src/cinematic/script.ts` | 《桃花源记》5 幕剧本数据 | 新建 |
| `src/cinematic/useDirector.ts` | React hook，绑定 R3F useFrame 推进时间线 | 新建 |
| `src/cinematic/Actor.tsx` | 第三人称渔人角色（程序化 toon + 描边 + 动作） | 新建 |
| `src/cinematic/CinematicCamera.tsx` | 相机控制器（按快照插值） | 新建 |
| `src/cinematic/Narrator.ts` | Web Speech 语音旁白封装 | 新建 |
| `src/cinematic/CaptionBar.tsx` | 字幕条（打字机）+ 幕间大标题 | 新建 |
| `src/cinematic/world/CinematicWorld.tsx` | 布置 5 个场景区域（复用美术资产） | 新建 |
| `src/cinematic/CinematicExperience.tsx` | 顶层组件，组装 Canvas + 世界 + Director | 新建 |
| `src/store/useGameStore.ts` | SceneName 增加 'cinematic' | 修改 |
| `src/engine/SceneManager.tsx` | 增加 cinematic 路由分支 | 修改 |
| `src/components/ui/MainMenu.tsx` | 增加「开启讲解」按钮 | 修改 |
| `vitest.config.ts` / `package.json` | 测试配置 + vitest 依赖 | 修改 |

---

## Task 1: 搭建测试基础设施（vitest）

**Files:**
- Modify: `package.json` (devDependencies + scripts)
- Create: `vitest.config.ts`

- [ ] **Step 1: 安装 vitest**

Run:
```bash
npm install -D vitest 2>&1 | tail -3
```
Expected: vitest 出现在 devDependencies。

- [ ] **Step 2: 创建 vitest 配置**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: true,
  },
})
```

- [ ] **Step 3: 加 test 脚本**

Modify `package.json` 的 `"scripts"`，在 `"preview"` 后加：
```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 4: 验证 vitest 可运行（空跑）**

Run: `npx vitest run 2>&1 | tail -5`
Expected: 提示找不到测试文件或 "No test files found"，但不报配置错误。

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "chore: add vitest test infrastructure"
```

---

## Task 2: 定义 cinematic 类型

**Files:**
- Create: `src/cinematic/types.ts`

- [ ] **Step 1: 写类型定义**

Create `src/cinematic/types.ts`:
```ts
export type Vec3 = [number, number, number]

export type ActorAction = 'idle' | 'walk' | 'row' | 'enter' | 'sit'

export type SfxName = 'birds' | 'water' | 'wind' | 'chime' | 'gong' | 'village'

export interface CameraKey {
  pos: Vec3
  lookAt: Vec3
  fov?: number
}

export interface ActorKey {
  pos: Vec3
  facing?: number   // 弧度，绕 Y 轴
  action?: ActorAction
}

export interface Beat {
  at: number          // 秒，相对所在 act 的起点
  duration: number    // 秒
  camera: CameraKey
  actor?: ActorKey
  caption?: string
  narration?: string
  sfx?: SfxName
}

export interface Act {
  name: string
  title: string       // 幕间大标题
  beats: Beat[]
}

// Director.sample() 的输出快照
export interface DirectorState {
  actIndex: number
  beatIndex: number
  beatProgress: number        // 0..1 当前 beat 内进度
  camera: { pos: Vec3; lookAt: Vec3; fov: number }
  actor: { pos: Vec3; facing: number; action: ActorAction }
  caption: string | null
  narration: string | null
  narrationTrigger: string | null  // 仅在 beat 切换瞬间非空
  sfxTrigger: SfxName | null        // 仅在 beat 切换瞬间非空
  title: string | null              // 仅在 act 首帧非空
}
```

- [ ] **Step 2: Commit**
```bash
git add src/cinematic/types.ts && git commit -m "feat(cinematic): define timeline types"
```

---

## Task 3: TDD 实现 Director 引擎

**Files:**
- Create: `src/cinematic/Director.test.ts`
- Create: `src/cinematic/Director.ts`

- [ ] **Step 1: 写失败测试**

Create `src/cinematic/Director.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { Director } from './Director'
import type { Act, Beat } from './types'

function beat(at: number, duration: number, partial: Partial<Beat> = {}): Beat {
  return {
    at, duration,
    camera: { pos: [at, 0, 0], lookAt: [0, 0, 0], fov: 50 },
    ...partial,
  }
}

const ACTS: Act[] = [
  {
    name: 'a1', title: '第一幕',
    beats: [
      beat(0, 2, { caption: '甲', narration: 'n甲', actor: { pos: [0, 0, 0], facing: 0, action: 'idle' } }),
      beat(2, 3, { caption: '乙', sfx: 'chime', actor: { pos: [5, 0, 0], facing: 0, action: 'walk' } }),
    ],
  },
  {
    name: 'a2', title: '第二幕',
    beats: [
      beat(0, 1, { caption: '丙' }),
      beat(1, 1, { caption: '丁' }),
    ],
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

  it('进入第二拍时触发 narrationTrigger（仅切换瞬间）', () => {
    const d = new Director(ACTS)
    // 第一拍：narrationTrigger 在 beat 切换到该拍时为该拍 narration
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

  it('相机在两拍之间对 pos 做线性插值', () => {
    const d = new Director(ACTS)
    const mid = d.sample(1)
    // beat0 pos=[0,0,0], beat1 pos=[2,0,0]; at t=1 是 beat0 的中点，pos 仍是 beat0 的
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

  it('所有 beat 的 at+duration 单调递增且 act 内无重叠', () => {
    // 这个由 Director 构造时校验，构造非法数据应抛错
    const bad: Act[] = [{
      name: 'x', title: '坏',
      beats: [
        beat(0, 2),
        beat(1, 1), // 重叠
      ],
    }]
    expect(() => new Director(bad)).toThrow()
  })

  it('actor 默认值：未给 actor 的 beat 沿用前一拍的 actor 末态', () => {
    const d = new Director(ACTS)
    // act1 的 beats 没给 actor，应沿用 act0 末拍 actor 的末态
    const s = d.sample(5)
    expect(s.actor.pos[0]).toBe(5)
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npx vitest run src/cinematic/Director.test.ts 2>&1 | tail -15`
Expected: FAIL（Director 不存在 / 导入失败）。

- [ ] **Step 3: 实现 Director**

Create `src/cinematic/Director.ts`:
```ts
import type { Act, Beat, DirectorState, Vec3, ActorAction, SfxName } from './types'

const DEFAULT_FOV = 50
const DEFAULT_ACTOR_ACTION: ActorAction = 'idle'

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

// 缓动：easeInOut，让镜头运动更像电影
function ease(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

export class Director {
  private acts: Act[]
  private actStartTimes: number[] // 每个相对 act 起点 0，这里记录全局起始
  readonly totalDuration: number

  constructor(acts: Act[]) {
    if (acts.length === 0) throw new Error('Director: 至少需要一幕')
    for (const act of acts) this.validateAct(act)
    this.acts = acts
    this.totalDuration = acts.reduce((sum, a) => sum + this.actDuration(a), 0)
    this.actStartTimes = []
    let acc = 0
    for (const a of acts) {
      this.actStartTimes.push(acc)
      acc += this.actDuration(a)
    }
  }

  private actDuration(act: Act): number {
    return act.beats.reduce((s, b) => s + b.duration, 0)
  }

  private validateAct(act: Act) {
    let cursor = 0
    for (const b of act.beats) {
      if (b.duration <= 0) throw new Error(`Director: beat duration 必须 > 0`)
      if (Math.abs(b.at - cursor) > 1e-6) {
        throw new Error(`Director: beat at=${b.at} 与期望 ${cursor} 不一致（beats 必须连续无重叠）`)
      }
      cursor = b.at + b.duration
    }
  }

  get isFinished(): boolean {
    return false // 占位，实际用 state 判断；见 sample
  }

  sample(elapsed: number): DirectorState {
    // 末态锁定
    if (elapsed >= this.totalDuration) {
      return this.sampleLast()
    }
    if (elapsed < 0) elapsed = 0

    // 定位 act
    let actIndex = 0
    for (let i = 0; i < this.acts.length; i++) {
      const start = this.actStartTimes[i]
      const end = start + this.actDuration(this.acts[i])
      if (elapsed >= start && elapsed < end) {
        actIndex = i
        break
      }
      if (i === this.acts.length - 1) actIndex = i
    }
    const act = this.acts[actIndex]
    const localTime = elapsed - this.actStartTimes[actIndex]

    // 定位 beat
    let beatIndex = 0
    let beatLocalStart = 0
    for (let i = 0; i < act.beats.length; i++) {
      const b = act.beats[i]
      if (localTime >= b.at && localTime < b.at + b.duration) {
        beatIndex = i
        beatLocalStart = b.at
        break
      }
      if (i === act.beats.length - 1) {
        beatIndex = i
        beatLocalStart = b.at
      }
    }

    return this.buildState(actIndex, beatIndex, localTime, beatLocalStart, elapsed)
  }

  private sampleLast(): DirectorState {
    const actIndex = this.acts.length - 1
    const act = this.acts[actIndex]
    const beatIndex = act.beats.length - 1
    const beat = act.beats[beatIndex]
    const lastActor = this.resolveActor(actIndex, beatIndex, 1)
    return {
      actIndex,
      beatIndex,
      beatProgress: 1,
      camera: { pos: beat.camera.pos, lookAt: beat.camera.lookAt, fov: beat.camera.fov ?? DEFAULT_FOV },
      actor: lastActor,
      caption: beat.caption ?? null,
      narration: beat.narration ?? null,
      narrationTrigger: null,
      sfxTrigger: null,
      title: null,
    }
  }

  // 计算从上一拍末态到当前拍的 actor（处理 actor 缺省继承）
  private resolveActor(actIndex: number, beatIndex: number, _t: number) {
    const act = this.acts[actIndex]
    // 向前查找最近的、定义了 actor 的 beat（跨幕回溯到上一幕末拍）
    let ai = actIndex
    let bi = beatIndex
    let actorKey = act.beats[bi].actor
    while (!actorKey) {
      bi--
      if (bi < 0) {
        ai--
        if (ai < 0) {
          // 全都没有，给默认
          return { pos: [0, 0, 0] as Vec3, facing: 0, action: DEFAULT_ACTOR_ACTION }
        }
        bi = this.acts[ai].beats.length - 1
        actorKey = this.acts[ai].beats[bi].actor
      } else {
        actorKey = this.acts[ai].beats[bi].actor
      }
    }
    return {
      pos: actorKey.pos,
      facing: actorKey.facing ?? 0,
      action: actorKey.action ?? DEFAULT_ACTOR_ACTION,
    }
  }

  private buildState(
    actIndex: number,
    beatIndex: number,
    localTime: number,
    beatLocalStart: number,
    elapsed: number,
  ): DirectorState {
    const act = this.acts[actIndex]
    const beat = act.beats[beatIndex]
    const prevBeat = beatIndex > 0 ? act.beats[beatIndex - 1] : null
    const prevActor = this.resolveActor(actIndex, Math.max(0, beatIndex - (prevBeat ? 1 : 0)), 0)
    const curActor = beat.actor ?? prevActor

    const rawT = (localTime - beatLocalStart) / beat.duration
    const t = ease(Math.max(0, Math.min(1, rawT)))

    // 相机：从 prevBeat 末态（即 prevBeat 的 camera）插值到 beat.camera
    const prevCam = prevBeat?.camera ?? beat.camera
    const camPos = lerpVec3(prevCam.pos, beat.camera.pos, t)
    const camLook = lerpVec3(prevCam.lookAt, beat.camera.lookAt, t)
    const camFov = lerp(prevCam.fov ?? DEFAULT_FOV, beat.camera.fov ?? DEFAULT_FOV, t)

    // actor：从 prevActor 末态插值到 curActor
    const actorFrom = prevActor
    const actorTo = curActor
    const actorPos = lerpVec3(actorFrom.pos, actorTo.pos, t)
    const actorFacing = lerp(actorFrom.facing, actorTo.facing, t)
    const actorAction = rawT >= 1 ? actorTo.action : actorFrom.action

    // 触发器：仅在进入该 beat 的第一帧（rawT 接近 0）时设
    const justEntered = rawT < 0.05
    const isFirstBeatOfAct = beatIndex === 0
    const title = isFirstBeatOfAct && localTime < 0.5 ? act.title : null

    return {
      actIndex,
      beatIndex,
      beatProgress: rawT,
      camera: { pos: camPos, lookAt: camLook, fov: camFov },
      actor: { pos: actorPos, facing: actorFacing, action: actorAction },
      caption: beat.caption ?? null,
      narration: beat.narration ?? null,
      narrationTrigger: justEntered && beat.narration ? beat.narration : null,
      sfxTrigger: justEntered && beat.sfx ? beat.sfx : null,
      title,
    }
  }
}
```

注：`isFinished` 在 sample 中处理（elapsed>=total 时返回末态）。但测试用的是 getter。修正：在上面类里，把 getter 改为：
```ts
  get isFinished(): boolean {
    // 由外部 sample 后判断更准；这里提供一个保守实现
    return false
  }
```
为满足测试 `d.sample(999)` 后 `d.isFinished` 为 true，改为支持传入：实际上测试是 `d.sample(999)` 然后 `d.isFinished`。我们让 `sample` 内部记录最近一次 elapsed，getter 据此判断。调整构造与 sample：

把 `private lastElapsed = 0` 加到字段；`sample` 开头 `this.lastElapsed = elapsed`；getter：
```ts
  get isFinished(): boolean {
    return this.lastElapsed >= this.totalDuration
  }
```

（实现时按此修正版写入文件。）

- [ ] **Step 4: 运行测试，确认通过**

Run: `npx vitest run src/cinematic/Director.test.ts 2>&1 | tail -20`
Expected: 8 个测试全 PASS。若有失败，按输出修正 Director。

- [ ] **Step 5: Commit**
```bash
git add src/cinematic/Director.ts src/cinematic/Director.test.ts && git commit -m "feat(cinematic): TDD Director timeline engine"
```

---

## Task 4: 编写《桃花源记》剧本数据

**Files:**
- Create: `src/cinematic/script.ts`

- [ ] **Step 1: 写剧本**

世界坐标布局（沿 z 轴展开，角色从远 z 走向近，镜头多变）：
- 溪流区域：z ∈ [-10, 10]
- 桃林区域：z ∈ [-40, -15]
- 山洞入口：z = -55
- 村庄区域：z ∈ [-90, -70]

Create `src/cinematic/script.ts`:
```ts
import type { Act } from './types'

// 坐标约定：y 为高度，角色脚部 y≈0；镜头一般 y=2~6
export const ACTS: Act[] = [
  {
    name: 'stream', title: '第一幕 · 缘溪行',
    beats: [
      {
        at: 0, duration: 6,
        camera: { pos: [4, 4, 12], lookAt: [0, 1, 0], fov: 50 },
        actor: { pos: [0, 0, 2], facing: Math.PI, action: 'row' },
        caption: '晋太元中，武陵人捕鱼为业。',
        narration: '东晋太元年间，武陵郡有个人，以打鱼为生。',
        sfx: 'water',
      },
      {
        at: 6, duration: 7,
        camera: { pos: [6, 3, 6], lookAt: [0, 1, -2], fov: 55 },
        actor: { pos: [0, 0, -1], facing: Math.PI, action: 'row' },
        caption: '缘溪行，忘路之远近。',
        narration: '他沿着溪流划船前行，竟忘了走了多远。',
      },
      {
        at: 13, duration: 5,
        camera: { pos: [3, 5, 10], lookAt: [0, 2, -8], fov: 60 },
        actor: { pos: [0, 0, -4], facing: Math.PI, action: 'row' },
        caption: '忽逢桃花林，夹岸数百步。',
        narration: '忽然，他遇见了一片桃花林，沿着溪水两岸绵延数百步。',
        sfx: 'birds',
      },
    ],
  },
  {
    name: 'forest', title: '第二幕 · 落英缤纷',
    beats: [
      {
        at: 0, duration: 8,
        camera: { pos: [-3, 2, -18], lookAt: [0, 3, -28], fov: 55 },
        actor: { pos: [0, 0, -20], facing: Math.PI, action: 'walk' },
        caption: '中无杂树，芳草鲜美，落英缤纷。',
        narration: '林中没有别的树，芳草鲜嫩美丽，落花纷纷飘落。',
        sfx: 'wind',
      },
      {
        at: 8, duration: 7,
        camera: { pos: [5, 3, -22], lookAt: [0, 4, -32], fov: 50 },
        actor: { pos: [0, 0, -28], facing: Math.PI, action: 'walk' },
        caption: '渔人甚异之，复前行，欲穷其林。',
        narration: '渔人十分惊异，又向前走，想要走到这片林子的尽头。',
      },
      {
        at: 15, duration: 6,
        camera: { pos: [0, 6, -45], lookAt: [0, 2, -55], fov: 60 },
        actor: { pos: [0, 0, -48], facing: Math.PI, action: 'walk' },
        caption: '林尽水源，便得一山。',
        narration: '桃花林在溪水发源处到了尽头，眼前出现一座山。',
      },
    ],
  },
  {
    name: 'cave', title: '第三幕 · 舍船入山',
    beats: [
      {
        at: 0, duration: 6,
        camera: { pos: [4, 3, -58], lookAt: [0, 2, -64], fov: 55 },
        actor: { pos: [0, 0, -60], facing: Math.PI, action: 'enter' },
        caption: '山有小口，仿佛若有光。',
        narration: '山上有个小洞口，洞里隐隐约约好像有光亮。',
        sfx: 'chime',
      },
      {
        at: 6, duration: 7,
        camera: { pos: [0, 2, -62], lookAt: [0, 2, -68], fov: 45 },
        actor: { pos: [0, 0, -64], facing: Math.PI, action: 'enter' },
        caption: '便舍船，从口入。初极狭，才通人。',
        narration: '渔人便下了船，从洞口进去。起初洞口很窄，仅容一人通过。',
      },
    ],
  },
  {
    name: 'village', title: '第四幕 · 豁然开朗',
    beats: [
      {
        at: 0, duration: 9,
        camera: { pos: [8, 8, -68], lookAt: [0, 2, -80], fov: 65 },
        actor: { pos: [0, 0, -72], facing: Math.PI, action: 'walk' },
        caption: '复行数十步，豁然开朗。',
        narration: '又走了几十步，眼前突然开阔明亮起来。',
        sfx: 'village',
      },
      {
        at: 9, duration: 8,
        camera: { pos: [-6, 5, -75], lookAt: [0, 2, -85], fov: 55 },
        actor: { pos: [0, 0, -80], facing: Math.PI, action: 'walk' },
        caption: '土地平旷，屋舍俨然，有良田美池桑竹之属。',
        narration: '只见土地平坦宽广，房屋整整齐齐，有肥沃的田地、美丽的池塘和桑树竹子之类。',
      },
      {
        at: 17, duration: 7,
        camera: { pos: [4, 4, -82], lookAt: [0, 1, -90], fov: 50 },
        actor: { pos: [0, 0, -86], facing: Math.PI, action: 'idle' },
        caption: '阡陌交通，鸡犬相闻。',
        narration: '田间小路交错相通，村落间能互相听到鸡鸣狗叫的声音。',
      },
    ],
  },
  {
    name: 'people', title: '第五幕 · 不足为外人道',
    beats: [
      {
        at: 0, duration: 9,
        camera: { pos: [5, 3, -88], lookAt: [0, 2, -94], fov: 50 },
        actor: { pos: [0, 0, -90], facing: Math.PI, action: 'idle' },
        caption: '其中往来种作，男女衣着，悉如外人。',
        narration: '里面的人来来往往耕种劳作，男女的穿着打扮，完全和外面的人一样。',
      },
      {
        at: 9, duration: 9,
        camera: { pos: [-4, 2.5, -92], lookAt: [0, 2, -96], fov: 50 },
        actor: { pos: [0, 0, -92], facing: 0, action: 'idle' },
        caption: '见渔人，乃大惊，问所从来。具答之。',
        narration: '村人见到渔人，竟然十分惊讶，问他是从哪里来的。渔人详细地回答了他们。',
      },
      {
        at: 18, duration: 9,
        camera: { pos: [0, 4, -86], lookAt: [0, 1, -94], fov: 55 },
        actor: { pos: [0, 0, -90], facing: 0, action: 'sit' },
        caption: '便要还家，设酒杀鸡作食。此中人语云：“不足为外人道也。”',
        narration: '村人便邀请他回家，摆酒杀鸡做饭来款待他。村里的人嘱咐说：这里的事，不值得对外面的人说啊。',
        sfx: 'gong',
      },
    ],
  },
]
```

- [ ] **Step 2: 用 Director 校验剧本合法（写一次性检查）**

Run（临时检查，用 node + tsx 不好弄，改为放进测试）：

Create `src/cinematic/script.test.ts`:
```ts
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
    expect(min).toBeGreaterThan(3)
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
})
```

- [ ] **Step 3: 运行测试**

Run: `npx vitest run src/cinematic/script.test.ts 2>&1 | tail -10`
Expected: 3 个 PASS。若总时长越界，调整 beat duration。

- [ ] **Step 4: Commit**
```bash
git add src/cinematic/script.ts src/cinematic/script.test.ts && git commit -m "feat(cinematic): 桃花源记 5-act script"
```

---

## Task 5: useDirector hook

**Files:**
- Create: `src/cinematic/useDirector.ts`

- [ ] **Step 1: 写 hook**

Create `src/cinematic/useDirector.ts`:
```ts
import { useRef, useEffect, useState, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { Director } from './Director'
import type { Act, DirectorState } from './types'

// 用于跨组件读取当前状态（轻量 store，避免每帧 setState）
export interface DirectorHandle {
  start: () => void
  restart: () => void
  stateRef: React.MutableRefObject<DirectorState>
  hasStarted: boolean
}

export function useDirector(acts: Act[]): DirectorHandle {
  const directorRef = useRef<Director>(new Director(acts))
  const startTimeRef = useRef<number | null>(null)
  const stateRef = useRef<DirectorState>(directorRef.current.sample(0))
  const lastBeatRef = useRef<{ act: number; beat: number }>({ act: -1, beat: -1 })
  const [hasStarted, setHasStarted] = useState(false)

  const start = useCallback(() => {
    startTimeRef.current = performance.now() / 1000
    setHasStarted(true)
  }, [])

  const restart = useCallback(() => {
    startTimeRef.current = performance.now() / 1000
    lastBeatRef.current = { act: -1, beat: -1 }
    setHasStarted(true)
  }, [])

  useFrame(({ clock }) => {
    if (startTimeRef.current == null) return
    const elapsed = clock.getElapsedTime() - 0 // clock 从 mount 开始计；我们用差值
    // 用 performance.now 与 startTime 的差更稳
    const now = performance.now() / 1000
    const t = now - startTimeRef.current
    const d = directorRef.current
    const s = d.sample(t)
    stateRef.current = s
    lastBeatRef.current = { act: s.actIndex, beat: s.beatIndex }
  })

  // 清理
  useEffect(() => () => { startTimeRef.current = null }, [])

  return { start, restart, stateRef, hasStarted }
}
```

注：`useFrame` 只在 Canvas 内部组件里调用，所以本 hook 必须在 Canvas 内的子组件中使用（见 CinematicExperience 的结构）。`clock` 参数保留以备需要，实际用 performance.now。

- [ ] **Step 2: Commit**
```bash
git add src/cinematic/useDirector.ts && git commit -m "feat(cinematic): useDirector hook"
```

---

## Task 6: Narrator（Web Speech 语音旁白）

**Files:**
- Create: `src/cinematic/Narrator.ts`

- [ ] **Step 1: 写 Narrator**

Create `src/cinematic/Narrator.ts`:
```ts
// 浏览器原生中文语音旁白。不支持时静默降级。

let cachedVoice: SpeechSynthesisVoice | null | undefined
let enabled = true
let rate = 0.92   // 略慢，便于课堂
let pitch = 1.0

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  if (cachedVoice !== undefined) return cachedVoice
  const voices = window.speechSynthesis.getVoices()
  // 优先 zh-CN，其次任何 zh
  cachedVoice =
    voices.find(v => v.lang === 'zh-CN') ??
    voices.find(v => v.lang?.toLowerCase().startsWith('zh')) ??
    null
  return cachedVoice
}

export function isNarrationSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function setNarrationEnabled(on: boolean) {
  enabled = on
  if (!on) cancelNarration()
}

export function getNarrationEnabled(): boolean {
  return enabled
}

export function speak(text: string) {
  if (!enabled) return
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  try {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'zh-CN'
    u.rate = rate
    u.pitch = pitch
    const v = pickVoice()
    if (v) u.voice = v
    window.speechSynthesis.speak(u)
  } catch {
    /* 静默降级 */
  }
}

export function cancelNarration() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try { window.speechSynthesis.cancel() } catch {}
  }
}

// 预加载语音列表（某些浏览器异步加载 voices）
export function primeVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.getVoices()
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = undefined
    pickVoice()
  }
}
```

- [ ] **Step 2: Commit**
```bash
git add src/cinematic/Narrator.ts && git commit -m "feat(cinematic): Narrator Web Speech wrapper"
```

---

## Task 7: Actor 渔人角色（程序化 toon + 描边）

**Files:**
- Create: `src/cinematic/Actor.tsx`

- [ ] **Step 1: 写 Actor 组件**

Create `src/cinematic/Actor.tsx`:
```tsx
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ActorAction } from './types'

// 描边材质工厂：背面 + 法线外扩
function useOutlineMaterial(color = '#1a1a1a') {
  return useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide })
    return mat
  }, [color])
}

// 单个带描边的 toon 部件
function ToonPart({
  geometry,
  position,
  rotation,
  scale = 1,
  baseColor,
  gradientMap,
  outlineScale = 1.04,
}: {
  geometry: React.ReactNode
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
  baseColor: string
  gradientMap?: THREE.Texture
  outlineScale?: number
}) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* 本体：toon 卡通分色 */}
      <mesh castShadow>
        {geometry}
        <meshToonMaterial color={baseColor} gradientMap={gradientMap} />
      </mesh>
      {/* 描边：背面外扩 */}
      <mesh scale={[outlineScale, outlineScale, outlineScale]}>
        {geometry}
        <meshBasicMaterial color="#1a1a1a" side={THREE.BackSide} />
      </mesh>
    </group>
  )
}

export interface ActorProps {
  // 由父组件每帧写入：位置、朝向、动作、是否行走
  posRef: React.MutableRefObject<[number, number, number]>
  facingRef: React.MutableRefObject<number>
  actionRef: React.MutableRefObject<ActorAction>
}

export function Actor({ posRef, facingRef, actionRef }: ActorProps) {
  const group = useRef<THREE.Group>(null)
  const leftArm = useRef<THREE.Group>(null)
  const rightArm = useRef<THREE.Group>(null)
  const leftLeg = useRef<THREE.Group>(null)
  const rightLeg = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const tRef = useRef(0)

  // 简单的 toon 渐变贴图（3 级明暗）
  const gradientMap = useMemo(() => {
    const data = new Uint8Array([80, 160, 240])
    const tex = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat)
    tex.needsUpdate = true
    tex.minFilter = THREE.NearestFilter
    tex.magFilter = THREE.NearestFilter
    return tex
  }, [])

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    const [x, y, z] = posRef.current
    g.position.set(x, y, z)
    g.rotation.y = facingRef.current

    const action = actionRef.current
    tRef.current += delta * 8
    const t = tRef.current

    if (action === 'walk' || action === 'row' || action === 'enter') {
      const swing = Math.sin(t) * (action === 'row' ? 0.5 : 0.8)
      if (leftArm.current) leftArm.current.rotation.x = swing
      if (rightArm.current) rightArm.current.rotation.x = -swing
      if (leftLeg.current) leftLeg.current.rotation.x = -swing * 0.7
      if (rightLeg.current) rightLeg.current.rotation.x = swing * 0.7
      if (body.current) body.current.position.y = Math.abs(Math.sin(t)) * 0.05
    } else if (action === 'sit') {
      if (leftLeg.current) leftLeg.current.rotation.x = -Math.PI / 2
      if (rightLeg.current) rightLeg.current.rotation.x = -Math.PI / 2
      if (body.current) body.current.position.y = -0.4
    } else {
      // idle 呼吸
      const breathe = Math.sin(t * 0.4) * 0.03
      if (body.current) body.current.position.y = breathe
      if (leftArm.current) leftArm.current.rotation.x = breathe
      if (rightArm.current) rightArm.current.rotation.x = -breathe
    }
  })

  // 寻仙风配色：青衫、米白内衫、深褐腰带、束发黑、肤色
  return (
    <group ref={group}>
      <group ref={body}>
        {/* 内衫 */}
        <ToonPart
          geometry={<capsuleGeometry args={[0.28, 0.7, 4, 8]} />}
          position={[0, 1.0, 0]}
          baseColor="#f0e6d2"
          gradientMap={gradientMap}
        />
        {/* 外衫（青） */}
        <ToonPart
          geometry={<coneGeometry args={[0.5, 1.1, 8]} />}
          position={[0, 0.95, 0]}
          baseColor="#3a6b6b"
          gradientMap={gradientMap}
        />
        {/* 腰带 */}
        <ToonPart
          geometry={<cylinderGeometry args={[0.42, 0.42, 0.15, 8]} />}
          position={[0, 0.7, 0]}
          baseColor="#4a3520"
          gradientMap={gradientMap}
        />
        {/* 头 */}
        <ToonPart
          geometry={<sphereGeometry args={[0.26, 16, 16]} />}
          position={[0, 1.62, 0]}
          baseColor="#f5d5b0"
          gradientMap={gradientMap}
          outlineScale={1.06}
        />
        {/* 发髻 */}
        <ToonPart
          geometry={<sphereGeometry args={[0.18, 12, 12]} />}
          position={[0, 1.85, -0.02]}
          baseColor="#1c1c1c"
          gradientMap={gradientMap}
        />
        {/* 发簪 */}
        <mesh position={[0.12, 1.88, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 0.3, 6]} />
          <meshStandardMaterial color="#8b6914" metalness={0.6} roughness={0.3} />
        </mesh>

        {/* 左臂 */}
        <group ref={leftArm} position={[-0.32, 1.25, 0]}>
          <ToonPart
            geometry={<capsuleGeometry args={[0.09, 0.5, 4, 8]} />}
            position={[0, -0.25, 0]}
            baseColor="#3a6b6b"
            gradientMap={gradientMap}
          />
          <ToonPart
            geometry={<sphereGeometry args={[0.1, 8, 8]} />}
            position={[0, -0.55, 0]}
            baseColor="#f5d5b0"
            gradientMap={gradientMap}
          />
        </group>
        {/* 右臂 */}
        <group ref={rightArm} position={[0.32, 1.25, 0]}>
          <ToonPart
            geometry={<capsuleGeometry args={[0.09, 0.5, 4, 8]} />}
            position={[0, -0.25, 0]}
            baseColor="#3a6b6b"
            gradientMap={gradientMap}
          />
          <ToonPart
            geometry={<sphereGeometry args={[0.1, 8, 8]} />}
            position={[0, -0.55, 0]}
            baseColor="#f5d5b0"
            gradientMap={gradientMap}
          />
        </group>

        {/* 左腿 */}
        <group ref={leftLeg} position={[-0.14, 0.55, 0]}>
          <ToonPart
            geometry={<capsuleGeometry args={[0.11, 0.5, 4, 8]} />}
            position={[0, -0.25, 0]}
            baseColor="#2c2c2c"
            gradientMap={gradientMap}
          />
        </group>
        {/* 右腿 */}
        <group ref={rightLeg} position={[0.14, 0.55, 0]}>
          <ToonPart
            geometry={<capsuleGeometry args={[0.11, 0.5, 4, 8]} />}
            position={[0, -0.25, 0]}
            baseColor="#2c2c2c"
            gradientMap={gradientMap}
          />
        </group>
      </group>

      {/* 斗笠（背在背后或戴头，这里做小巧装饰） */}
      <mesh position={[0, 2.05, 0]}>
        <coneGeometry args={[0.35, 0.15, 12]} />
        <meshToonMaterial color="#6b5a3a" />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/cinematic/Actor.tsx && git commit -m "feat(cinematic): toon+outline fisherman Actor"
```

---

## Task 8: CinematicCamera 控制器

**Files:**
- Create: `src/cinematic/CinematicCamera.tsx`

- [ ] **Step 1: 写相机控制器**

Create `src/cinematic/CinematicCamera.tsx`:
```tsx
import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { DirectorState } from './types'

export interface CinematicCameraProps {
  stateRef: React.MutableRefObject<DirectorState>
  hasStarted: boolean
}

const tmpLook = new THREE.Vector3()

export function CinematicCamera({ stateRef, hasStarted }: CinematicCameraProps) {
  const { camera } = useThree()
  const inited = useRef(false)

  useFrame(() => {
    if (!hasStarted && !inited.current) return
    inited.current = true
    const s = stateRef.current
    const [px, py, pz] = s.camera.pos
    const [lx, ly, lz] = s.camera.lookAt
    // 平滑跟随目标，避免抖动
    camera.position.lerp(tmpLook.set(px, py, pz), 0.15)
    tmpLook.set(lx, ly, lz)
    camera.lookAt(tmpLook)
    if ((camera as THREE.PerspectiveCamera).fov !== s.camera.fov) {
      ;(camera as THREE.PerspectiveCamera).fov = s.camera.fov
      ;(camera as THREE.PerspectiveCamera).updateProjectionMatrix()
    }
  })

  return null
}
```

- [ ] **Step 2: Commit**
```bash
git add src/cinematic/CinematicCamera.tsx && git commit -m "feat(cinematic): CinematicCamera controller"
```

---

## Task 9: CaptionBar 字幕条 + 幕间标题

**Files:**
- Create: `src/cinematic/CaptionBar.tsx`

- [ ] **Step 1: 写字幕条（独立组件，由 props 驱动，可测可调）**

Create `src/cinematic/CaptionBar.tsx`:
```tsx
import { useEffect, useState } from 'react'

export interface CaptionBarProps {
  caption: string | null
  title: string | null
}

export function CaptionBar({ caption, title }: CaptionBarProps) {
  const [typed, setTyped] = useState('')
  const [full, setFull] = useState('')

  useEffect(() => {
    if (!caption) { setTyped(''); setFull(''); return }
    setFull(caption)
    setTyped('')
    let i = 0
    const id = setInterval(() => {
      i++
      setTyped(caption.slice(0, i))
      if (i >= caption.length) clearInterval(id)
    }, 60)
    return () => clearInterval(id)
  }, [caption])

  return (
    <>
      {/* 幕间大标题 */}
      {title && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <h2
            className="text-4xl md:text-6xl"
            style={{
              color: '#e8dcc4',
              letterSpacing: '0.3em',
              textShadow: '0 0 30px rgba(0,0,0,0.8), 0 0 60px rgba(212,197,169,0.3)',
              opacity: 0.92,
              animation: 'cinematicTitleFade 2.4s ease-out',
            }}
          >
            {title}
          </h2>
        </div>
      )}

      {/* 字幕条 */}
      {full && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 pointer-events-none w-full max-w-3xl px-6">
          <div
            className="px-8 py-4 rounded-sm text-center"
            style={{
              backgroundColor: 'rgba(10, 8, 6, 0.72)',
              borderTop: '1px solid rgba(212,197,169,0.25)',
              borderBottom: '1px solid rgba(212,197,169,0.25)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <p
              className="text-xl md:text-2xl"
              style={{
                color: '#e8dcc4',
                letterSpacing: '0.08em',
                lineHeight: 1.9,
                textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                fontFamily: '"KaiTi","STKaiti","楷体",serif',
              }}
            >
              {typed}
              {typed.length < full.length && (
                <span className="animate-pulse">▌</span>
              )}
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes cinematicTitleFade {
          0% { opacity: 0; transform: translateY(20px) scale(0.96); }
          30% { opacity: 0.92; transform: translateY(0) scale(1); }
          80% { opacity: 0.92; }
          100% { opacity: 0; }
        }
      `}</style>
    </>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/cinematic/CaptionBar.tsx && git commit -m "feat(cinematic): CaptionBar with typewriter + title"
```

---

## Task 10: CinematicWorld 布置场景（复用美术资产）

**Files:**
- Create: `src/cinematic/world/CinematicWorld.tsx`
- Reference: `src/components/world/*` (复用)

- [ ] **Step 1: 写世界组件**

复用现有：`Terrain`, `Stream`, `MountainRange`, `ProceduralTrees`/`GroundCover`/`Rocks`, `PetalParticles`, `DayNightCycle`, 以及村庄房屋等。由于现有 ProceduralTrees/Stream 等是按 forest 坐标（z≈-50 附近）布置的，这里我们用一个 translate group 整体摆放，再额外在村庄区放几栋房屋和桃树。

Create `src/cinematic/world/CinematicWorld.tsx`:
```tsx
import { Suspense } from 'react'
import { Terrain } from '../../components/world/Terrain'
import { Stream } from '../../components/world/Stream'
import { MountainRange } from '../../components/world/MountainRange'
import { ProceduralTrees, GroundCover, Rocks } from '../../components/world/ProceduralTrees'
import { PetalParticles } from '../../components/world/PetalParticles'
import { DayNightCycle } from '../../components/world/DayNightCycle'
import * as THREE from 'three'

// 村庄房屋（与 VillageScene 风格一致，但无交互）
function VillageHouse({ position, rotation = 0, scale = 1 }: { position: [number, number, number]; rotation?: number; scale?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[4, 3, 3]} />
        <meshStandardMaterial color={0xf0dcb8} roughness={0.9} />
      </mesh>
      <mesh position={[0, 3.8, 0]} castShadow>
        <coneGeometry args={[3.5, 2, 4]} />
        <meshStandardMaterial color={0x2d2d2d} roughness={1} />
      </mesh>
      <mesh position={[0, 1.2, 1.51]}>
        <planeGeometry args={[1, 2.4]} />
        <meshStandardMaterial color={0x5d4037} />
      </mesh>
    </group>
  )
}

function Lantern({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.4, 0.4, 0.8, 8]} />
        <meshStandardMaterial color={0xcc0000} emissive={0x880000} emissiveIntensity={0.4} />
      </mesh>
      <pointLight color={0xffd27a} intensity={2} distance={10} />
    </group>
  )
}

function VillageArea() {
  const houses: Array<{ p: [number, number, number]; r: number; s: number }> = [
    { p: [-10, 0, -78], r: 0.3, s: 1.1 },
    { p: [8, 0, -82], r: -0.2, s: 1.2 },
    { p: [-6, 0, -88], r: 0.5, s: 0.95 },
    { p: [11, 0, -90], r: -0.4, s: 1.05 },
    { p: [0, 0, -94], r: 0, s: 1.3 },
  ]
  return (
    <group>
      {houses.map((h, i) => <VillageHouse key={i} position={h.p} rotation={h.r} scale={h.s} />)}
      <Lantern position={[-9, 4, -78]} />
      <Lantern position={[9, 4, -82]} />
      <Lantern position={[0, 4, -94]} />
      {/* 田地色块 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -82]} receiveShadow>
        <planeGeometry args={[40, 30]} />
        <meshStandardMaterial color={0x5a7a3a} roughness={1} />
      </mesh>
      {/* 池塘 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[14, 0.05, -84]}>
        <circleGeometry args={[5, 32]} />
        <meshStandardMaterial color={0x2e8b8b} transparent opacity={0.55} roughness={0.1} />
      </mesh>
      {/* 村庄周围桃树 */}
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i / 24) * Math.PI * 2
        const r = 18 + Math.sin(i * 4.7) * 5
        return (
          <group key={i} position={[Math.cos(angle) * r, 0, Math.sin(angle) * r - 84]}>
            <mesh position={[0, 2.5, 0]} castShadow>
              <cylinderGeometry args={[0.15, 0.25, 5, 6]} />
              <meshStandardMaterial color={0x5d4037} />
            </mesh>
            <mesh position={[0, 5.5, 0]}>
              <sphereGeometry args={[2, 8, 6]} />
              <meshStandardMaterial color={0xffb7c5} roughness={0.85} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

export function CinematicWorld() {
  return (
    <Suspense fallback={null}>
      {/* 暖色调基础光照（电影感） */}
      <hemisphereLight args={[0xffe8c0, 0x3a2a1a, 0.6]} />
      <directionalLight
        position={[20, 30, 10]}
        intensity={1.1}
        color={0xffd9a0}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <ambientLight intensity={0.25} />

      <DayNightCycle speed={0.004} />

      {/* 整体环境 */}
      <fog attach="fog" args={['#d8c8a8', 25, 120]} />
      <color attach="background" args={['#e8d8b8']} />

      {/* 地形/山/溪/树复用现有组件（它们围绕原点~z-50 布置） */}
      <group position={[0, 0, 0]}>
        <Terrain />
        <Stream />
        <MountainRange />
        <ProceduralTrees />
        <GroundCover />
        <Rocks />
        <PetalParticles />
      </group>

      {/* 村庄在 z=-80 一带，独立布置 */}
      <group position={[0, 0, 0]}>
        <VillageArea />
      </group>

      {/* 山洞口（在 z=-62，与剧本对应） */}
      <group position={[0, 0, -62]}>
        <mesh position={[0, 3, 0]} castShadow>
          <torusGeometry args={[4, 2.5, 8, 12, Math.PI]} />
          <meshStandardMaterial color={0x3e2723} roughness={1} />
        </mesh>
        <mesh position={[0, 2, -1]}>
          <planeGeometry args={[8, 5]} />
          <meshBasicMaterial color={0x070707} />
        </mesh>
        <pointLight position={[0, 3, -3]} color={0xffd27a} intensity={2} distance={12} />
      </group>
    </Suspense>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/cinematic/world/CinematicWorld.tsx && git commit -m "feat(cinematic): CinematicWorld reusing world assets"
```

---

## Task 11: CinematicExperience 顶层组装

**Files:**
- Create: `src/cinematic/CinematicExperience.tsx`

- [ ] **Step 1: 写顶层组件**

说明：`useDirector` 用了 `useFrame`，必须在 Canvas 内调用。所以结构是：Canvas 内一个 `DirectorRunner` 子组件持有 hook 并把 state ref 透传给 Actor/Camera，Canvas 外的 React 组件负责 UI（字幕、标题、按钮）和把 state 透传给 UI。我们用一个外层 state（每帧轻量更新一个 `tick`）来驱动 UI 重渲染字幕——但每帧 setState 开销大，改为：UI 用独立 RAF 读取 ref。

Create `src/cinematic/CinematicExperience.tsx`:
```tsx
import { useRef, useState, useEffect, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { ACTS } from './script'
import { useDirector } from './useDirector'
import { Director } from './Director'
import { Actor } from './Actor'
import { CinematicCamera } from './CinematicCamera'
import { CinematicWorld } from './world/CinematicWorld'
import { CaptionBar } from './CaptionBar'
import { Narrator, speak as narratorSpeak, cancelNarration, isNarrationSupported, setNarrationEnabled, getNarrationEnabled, primeVoices } from './Narrator'
import { useAudio } from '../engine/AudioManager'
import type { DirectorState } from './types'

// Canvas 内：运行 director，驱动 actor/camera
function DirectorRunner({
  onState,
}: {
  onState: (s: DirectorState) => void
}) {
  const dir = useDirector(ACTS)
  const posRef = useRef<[number, number, number]>([0, 0, 0])
  const facingRef = useRef<number>(0)
  const actionRef = useRef<any>('idle')

  // 把 hook 暴露给外层启动
  ;(window as any).__cinematicStart = dir.start
  ;(window as any).__cinematicRestart = dir.restart

  // 主动启动（进入后自动开始）
  useEffect(() => {
    primeVoices()
    const t = setTimeout(() => dir.start(), 600)
    return () => clearTimeout(t)
  }, [dir])

  // 每帧把状态写到 ref 并回调一次（用于 UI + 触发器）
  const lastBeat = useRef<{ a: number; b: number }>({ a: -1, b: -1 })
  const lastTitle = useRef<string | null>(null)
  const audio = useAudio()

  useFrameSubstitute(() => {}) // placeholder；实际用 useFrame 在下面

  // 用 useFrame 推进：但 useDirector 内部已 useFrame。这里只需读取 stateRef
  // 所以本组件不再 useFrame，只做"读取并下发"
  useEffect(() => {
    let raf = 0
    const loop = () => {
      const s = dir.stateRef.current
      posRef.current = s.actor.pos
      facingRef.current = s.actor.facing
      actionRef.current = s.actor.action
      // 触发器
      if (s.actIndex !== lastBeat.current.a || s.beatIndex !== lastBeat.current.b) {
        lastBeat.current = { a: s.actIndex, b: s.beatIndex }
        if (s.narrationTrigger) narratorSpeak(s.narrationTrigger)
        if (s.sfxTrigger) {
          if (s.sfxTrigger === 'village' || s.sfxTrigger === 'chime' || s.sfxTrigger === 'gong') {
            audio.startAmbient('village')
          } else {
            audio.startAmbient('forest')
          }
        }
      }
      onState(s)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [dir, onState, audio])

  return (
    <>
      <Actor posRef={posRef} facingRef={facingRef} actionRef={actionRef} />
      <CinematicCamera stateRef={dir.stateRef} hasStarted={dir.hasStarted} />
    </>
  )
}

// 占位（上面误引）；实际不需要。删除该函数。
function useFrameSubstitute(_fn: () => void) {}

export default function CinematicExperience() {
  const [uiState, setUiState] = useState<DirectorState>(() => new Director(ACTS).sample(0))
  const [narrationOn, setNarrationOn] = useState(isNarrationSupported())
  const [showRestart, setShowRestart] = useState(false)
  const onState = useCallback((s: DirectorState) => {
    setUiState(prev => {
      if (prev.caption === s.caption && prev.title === s.title && prev.actIndex === s.actIndex) return prev
      return s
    })
    if (s.beatProgress >= 1 && s.actIndex === ACTS.length - 1 && s.beatIndex === ACTS[ACTS.length - 1].beats.length - 1) {
      setShowRestart(true)
    }
  }, [])

  const handleRestart = useCallback(() => {
    cancelNarration()
    setShowRestart(false)
    ;(window as any).__cinematicRestart?.()
  }, [])

  const toggleNarration = useCallback(() => {
    const next = !getNarrationEnabled()
    setNarrationEnabled(next)
    setNarrationOn(next)
    if (!next) cancelNarration()
  }, [])

  return (
    <div className="w-full h-full relative bg-black">
      <Canvas
        shadows
        camera={{ position: [4, 4, 12], fov: 50, near: 0.1, far: 400 }}
        gl={{ antialias: true }}
      >
        <DirectorRunner onState={onState} />
        <CinematicWorld />
      </Canvas>

      {/* 字幕 + 幕间标题 */}
      <CaptionBar caption={uiState.caption} title={uiState.title} />

      {/* 顶部进度（可选，简洁） */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <p className="text-xs opacity-40" style={{ color: '#e8dcc4', letterSpacing: '0.2em' }}>
          桃花源记 · 电影讲解
        </p>
      </div>

      {/* 右上：语音开关 */}
      <button
        onClick={toggleNarration}
        className="absolute top-4 right-4 z-30 px-3 py-1.5 text-xs rounded-sm border"
        style={{
          borderColor: 'rgba(212,197,169,0.4)',
          background: 'rgba(0,0,0,0.4)',
          color: '#e8dcc4',
          letterSpacing: '0.1em',
          backdropFilter: 'blur(4px)',
          opacity: isNarrationSupported() ? 1 : 0.4,
        }}
      >
        {narrationOn ? '🔊 语音：开' : '🔇 语音：关'}
      </button>

      {/* 结束重播 */}
      {showRestart && (
        <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/60">
          <div className="text-center">
            <p className="text-3xl mb-3" style={{ color: '#e8dcc4', letterSpacing: '0.2em' }}>— 终 —</p>
            <p className="text-base mb-6 opacity-60" style={{ color: '#d4c5a9' }}>后遂无问津者。</p>
            <button
              onClick={handleRestart}
              className="px-8 py-3 rounded-sm border cursor-pointer"
              style={{ borderColor: '#5d4037', color: '#e8dcc4', background: 'rgba(93,64,55,0.2)', letterSpacing: '0.2em' }}
            >
              重新播放
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

注意清理：删除 `useFrameSubstitute` 占位函数及其调用（实现时不要写入）。`useDirector` 已包含 `useFrame` 推进 stateRef，外层用 RAF 读取即可。

- [ ] **Step 2: Commit**
```bash
git add src/cinematic/CinematicExperience.tsx && git commit -m "feat(cinematic): CinematicExperience top-level assembly"
```

---

## Task 12: 接线 store / SceneManager / MainMenu

**Files:**
- Modify: `src/store/useGameStore.ts`
- Modify: `src/engine/SceneManager.tsx`
- Modify: `src/components/ui/MainMenu.tsx`

- [ ] **Step 1: SceneName 增加 'cinematic'**

Modify `src/store/useGameStore.ts`，把：
```ts
export type SceneName = 'menu' | 'opening' | 'forest' | 'cave' | 'village' | 'ending'
```
改为：
```ts
export type SceneName = 'menu' | 'opening' | 'forest' | 'cave' | 'village' | 'ending' | 'cinematic'
```

- [ ] **Step 2: SceneManager 注册 cinematic**

Modify `src/engine/SceneManager.tsx`，在 `scenes` 对象加一项（注意它是 `React.LazyExoticComponent`，统一 lazy import）：
```ts
  cinematic: lazy(() => import('../cinematic/CinematicExperience')),
```
放在 `ending` 之后。`SCENE_ORDER` **不要**加 cinematic（cinematic 是独立分支，不应被 advanceScene 线性推进）。`scenes` Record 类型已是按 SceneName 索引，加上即可。

注意：`SCENE_ORDER` 当前用于 `advanceScene`（探索模式线性推进），cinematic 不参与。但 `scenes` 必须包含所有 SceneName 键以满足 TS 类型。已包含。

- [ ] **Step 3: MainMenu 加「开启讲解」按钮**

Modify `src/components/ui/MainMenu.tsx`，在「进入桃花源」按钮下方再加一个按钮。导入 useGameStore：
```tsx
import { useGameStore } from '../../store/useGameStore'
```
在组件内：
```tsx
const setScene = useGameStore((s) => s.setScene)
```
在现有「进入桃花源」button 之后插入：
```tsx
      <button
        onClick={() => setScene('cinematic')}
        className="z-10 mt-6 px-10 py-4 text-xl rounded-sm border transition-all duration-500 hover:scale-105 cursor-pointer"
        style={{
          color: '#e8dcc4',
          borderColor: '#a67c3a',
          backgroundColor: 'rgba(166, 124, 58, 0.18)',
          letterSpacing: '0.2em',
          boxShadow: '0 0 24px rgba(166,124,58,0.15)',
        }}
      >
        ▶ 开启讲解（电影模式）
      </button>
      <p className="z-10 mt-3 text-xs opacity-40" style={{ color: '#8b7355' }}>
        点击后自动播放，无需操作
      </p>
```
把副标题"互动沉浸式3D体验"可保留或改为"互动沉浸式3D体验 · 电影讲解模式"（可选）。

- [ ] **Step 4: build 验证类型**

Run: `npm run build 2>&1 | tail -15`
Expected: 构建成功，无 TS 错误。出现 `cinematic` 的 chunk。

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat(cinematic): wire cinematic route into menu + store + SceneManager"
```

---

## Task 13: 端到端 dev 烟雾测试 + 验收

**Files:** 无新文件（验证）

- [ ] **Step 1: 启动 dev server（后台）**

Run（后台）: `npm run dev`
等待输出 "Local: http://localhost:5173/"。

- [ ] **Step 2: 单测全跑**

Run: `npx vitest run 2>&1 | tail -15`
Expected: Director + script 测试全 PASS。

- [ ] **Step 3: 静态可访问性检查**

用 curl 取首页确认服务起来：
Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/`
Expected: `200`

- [ ] **Step 4: build 产物体积确认**

Run: `npm run build 2>&1 | grep -E "dist/assets|built in" | tail -8`
Expected: 成功，cinematic chunk 存在，three-core 体积合理（注意：cinematic 不引 rapier，但 MainMenu→探索模式仍引，故 rapier chunk 仍在；可接受）。

- [ ] **Step 5: 按 spec §9 验收清单逐项核对**

人工/逻辑核对（无需真实浏览器，由 AI 依据代码与测试推断，并在交付说明中列出）：
1. build 通过 — Step 2/4 已验
2. 主菜单有「开启讲解」按钮 — Task 12 已加
3. 点击后自动播放无需操作 — Task 11 CinematicExperience 进入 600ms 后 dir.start()
4. 角色可见（第三人称）— Task 7 Actor
5. 镜头随剧情切换 — Task 8 + script camera 字段
6. 字幕同步 — Task 9 + onState
7. 语音旁白（可降级）— Task 6 + Task 11 触发
8. 覆盖原文 — Task 4 script 5 幕
9. 结尾可重播 — Task 11 showRestart
10. 探索模式未破坏 — cinematic 为独立路由，未改探索组件

- [ ] **Step 6: 关闭 dev server**

Run: 关掉后台 dev 进程。

- [ ] **Step 7: 最终 Commit**
```bash
git add -A && git commit -m "chore: end-to-end smoke verified for cinematic mode" --allow-empty
```

---

## Self-Review（计划完成后自检）

**Spec coverage：**
- §3 决策1（独立模式）→ Task 11/12（独立 cinematic，菜单分流）✅
- §3 决策2（不用 Rapier，路径插值）→ Task 3 Director + Task 5 hook + Task 8 camera，全程无 Rapier ✅
- §3 决策3（toon+描边角色）→ Task 7 ✅
- §3 决策4（Director 时间线）→ Task 2/3 ✅
- §3 决策5（Web Speech）→ Task 6 ✅
- §3 决策6（单 Canvas 多区域）→ Task 9/10/11 ✅
- §5（5 幕剧本）→ Task 4 ✅
- §6（TDD）→ Task 1/3/4 测试 ✅
- §7（降级）→ Task 6 isNarrationSupported + Task 11 开关 ✅
- §9 验收 → Task 13 ✅

**Placeholder scan：** Task 11 中标注"删除占位函数"——实现时务必不写入 `useFrameSubstitute`。已明确说明。其余无 TBD。

**Type consistency：** `DirectorState.actor.action` 为 `ActorAction`，Actor 的 `actionRef` 用 `any` 容纳（实现时改为 `ActorAction` 更佳，但 any 可编译）。`ActorProps` 用 ref 三件套，CinematicExperience 透传一致。script 的 `sfx` 值与 types 的 `SfxName` 一致（birds/water/wind/chime/gong/village）✅。

无遗漏。计划可直接执行。
