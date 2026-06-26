# 设计文档：桃花源记 · 电影讲解模式（Cinematic Mode）

- **日期**: 2026-06-27
- **状态**: Approved (自主决策 — 用户睡眠中)
- **目标截止**: 2026-06-27 09:00 上课演示
- **决策方式**: 用户已睡，无法逐项确认。所有设计决策由 AI 基于已掌握的需求信息自主拍板，理由逐条记录于此，供用户醒来后快速 review。

---

## 1. 背景与现状

项目 `peach-blossom-spring` 已有一个**第一人称交互探索游戏**：

- 技术栈：React 18 + R3F v8 + drei + Rapier + postprocessing + Tailwind v4 + Zustand + Vite 6
- 场景：`menu → opening → forest → cave → village → ending`，由 `SceneManager` 按 SCENE_ORDER 顺序切换
- 现有素材可复用：`ProceduralTrees`、`Terrain`、`Stream`、`MountainRange`、`DayNightCycle`、`InkWashEffect`（水墨后处理）、`AudioManager`（程序化鸟鸣/溪水/古琴/风声）、`PetalParticles`、村庄房屋/NPC/灯笼/桥
- 现有 `opening` 与 `cave` 已是半自动播片（打字机文字 + 定时 advanceScene）
- `forest` 和 `village` 是**交互式**：WASD 走动、按 E 对话、做选择
- 角色是**不可见的第一人称相机**，无第三人称角色模型

构建产物：`vite build` 通过，`dist/` 可用。

## 2. 用户需求（原话转述）

> 我通过 web3d 技术做一个课程讲解，上课时给学生讲课用。今天给学生讲《桃花源记》这篇课文。
> 我希望做一个网站，点击触发后就**开启桃花源的讲解**。
> 希望人物角色类似网络游戏的场景，界面里也是。我喜欢腾讯出的「寻仙」游戏，希望角色和画风有点类似寻仙。
> 我去睡觉了，你利用能利用的 skill 完成这个目标，希望睡醒的时候运行项目就可以给学生看。
> 我希望**点击触发进入剧情按钮后，就不再操作了**，直接像看电影一样讲这个故事。

**核心需求提炼（按优先级）：**

| # | 需求 | 优先级 | 说明 |
|---|------|--------|------|
| P0 | 一键触发、全程自动播放、无需操作 | 必须 | "像看电影一样" |
| P0 | 故事完整覆盖《桃花源记》原文 | 必须 | 讲解课核心 |
| P0 | 醒来即可运行展示 | 必须 | 截止 09:00 |
| P1 | 可见的第三人称角色（寻仙风） | 重要 | 用户明确偏好 |
| P1 | 寻仙式国风仙侠画风 | 重要 | 用户明确偏好 |
| P2 | 字幕同步 | 加分 | 讲解课便于跟读 |
| P2 | 中文语音旁白 | 加分 | 课堂效果好 |
| P3 | 可暂停/跳过 | 可选 | 不强求 |

## 3. 关键设计决策（含自主决策理由）

### 决策 1：新建独立 `cinematic` 模式，不改动现有可玩探索模式

**理由**：
- 现有探索模式是已有的、可工作的资产，破坏它没有收益
- 电影模式与探索模式的交互逻辑完全相反（一个全自动、一个全手动），强行复用会让两个模式都变差
- 单一职责，两套模式独立，便于维护和未来扩展
- 主菜单上加一个按钮分流即可，路由成本低

**代价**：会有一部分代码（场景美术资产）的引用方式需要适配。但美术资产（树、地形、溪流等）是纯展示组件，可直接复用，无需重写。

### 决策 2：第三人称可见角色，走**预定路径插值**（不用 Rapier 物理）

**理由**：
- 电影模式的角色动作是**剧本预定的**（沿溪走、入洞、出洞），不需要玩家物理控制
- 用路径插值（关键帧 + lerp）控制角色和相机，运动**精确可控、可复现**，正适合电影叙事
- 移除 Rapier 可减少 ~2.2MB 的 bundle（当前最大块），降低加载时间，对课堂演示（可能网络一般）有利
- 物理引擎对"看电影"场景是纯负担：没有碰撞需求、没有跳跃需求

**代价**：无法像探索模式那样自由走动——但这正是电影模式的本意。

### 决策 3：角色用程序化几何体 + Toon（卡通）描边，模拟寻仙画风

**理由**：
- 寻仙的核心视觉特征是：**Q 版国风、卡通描边、饱和但柔和的配色、飘逸衣袂**
- 无法在无外部资源的情况下加载真实寻仙模型，但可以用：
  - 程序化几何体拼出青衫渔人（束发、长衫、斗笠、渔具）
  - `MeshToonMaterial`（three 内置）实现卡通分色
  - 描边（背面法线外扩的黑色外壳）实现勾线
  - 飘动的衣袂（顶点着色器或简单的骨骼摆动）
- 这套方案零外部资源依赖、可控、与现有水墨后处理风格统一（水墨 + 卡通勾线 = 国风）
- 比"导入 GLB"更可靠：不会因为缺模型/加载失败而黑屏（课堂演示最怕这个）

**代价**：角色精细度不如真实游戏模型，但通过 toon + 描边 + 飘动 + 镜头调度可以达到"国风仙侠"的观感。这是时间约束下的最佳折中。

### 决策 4：Director 导演引擎，时间线（timeline）驱动

**理由**：
- "像看电影一样"的本质是**时间线编排**：某个时刻镜头在哪、角色在哪、字幕是什么、播什么音效
- 用一个声明式的 timeline 数据结构（事件数组）驱动整个播放，可读、可调、可测
- 每个 beat（节拍）定义：时刻、镜头目标、角色位置/朝向、字幕、旁白文本、音效
- Director 在 `useFrame` 里按累积时间推进，触发对应 beat，自动 advance 到下一段
- 这正是"goal/loop 编程"的落地：**目标是"讲完整个故事"**，loop 是"每帧推进时间线"

**结构**：
```ts
type Beat = {
  at: number          // 该节拍开始的秒数（相对本幕）
  duration: number    // 该节拍持续秒数
  camera: { pos: Vec3; lookAt: Vec3; fov?: number }
  actor?: { pos: Vec3; facing?: number; action?: 'walk'|'idle'|'row'|'enter' }
  caption?: string    // 屏幕字幕（原文/白话）
  narration?: string  // 旁白文本（用于 TTS 朗读）
  sfx?: 'birds'|'water'|'wind'|'chime'|'gong'|'village'
  title?: string      // 幕间大标题（如"第一幕 · 缘溪行"）
}
type Act = { name: string; beats: Beat[] }   // 一"幕"
```

### 决策 5：Web Speech API 做中文语音旁白

**理由**：
- 浏览器原生 `SpeechSynthesis`，支持中文（`zh-CN`），**零外部依赖、零网络、零费用**
- 讲解课场景：老师在教室放，语音能增强沉浸感，且字幕同步便于学生跟读
- 程序化音频（现有 AudioManager）已能做环境音（鸟鸣/溪水/古琴），语音旁白与之叠加效果好
- 备选方案对比：
  - 录制音频文件 → 需要 TTS 服务或人工录音，用户在睡觉，无法提供，**排除**
  - 调用云 TTS API → 需要密钥、可能产生费用、有网络延迟，**排除**
  - Web Speech API → 原生、免费、即时，**选用**（降级优雅：不支持时静默，字幕仍在）

**代价**：不同浏览器/系统的中文语音音色不一（macOS 的 Tingting/Tian-Tian 较好）。设为可开关，字幕为主、语音为辅。

### 决策 6：单 Canvas + 镜头切换，多"幕"在同一连续世界

**理由**：
- 把溪流、桃林、山洞、村庄布置在**同一个大世界**的不同坐标区域
- 角色沿一条贯穿路径行走，镜头跟随/切换，营造"一镜到底"的电影感
- 避免 scene 切换的加载闪烁（现有 SceneManager 有 800ms 黑屏过渡），观感更像电影
- 幕间用淡入淡出 + 大标题（如"第二幕 · 豁然开朗"）分隔

**代价**：世界设计更复杂，需要规划坐标布局。但用 timeline 的 `camera` 字段即可精确调度。

## 4. 架构设计

### 4.1 模块划分（单一职责）

```
src/
├── engine/
│   ├── SceneManager.tsx        [改] 增加 'cinematic' 路由分支
│   └── PlayerController.tsx    [不动] 仅供探索模式用
├── cinematic/                  [新] 整个电影模式
│   ├── Director.ts             时间线引擎（纯逻辑，可单测）
│   ├── useDirector.ts          React hook，绑定 useFrame 推进时间线
│   ├── types.ts                Beat/Act 类型定义
│   ├── script.ts               《桃花源记》剧本（acts + beats 数据）
│   ├── Actor.tsx               第三人称渔人角色（程序化 + toon + 描边）
│   ├── CinematicCamera.tsx     相机控制器（按 beat 的 camera 字段插值）
│   ├── Narrator.ts             Web Speech 语音旁白封装
│   ├── CaptionBar.tsx          字幕条（打字机 + 原文/白话）
│   ├── CinematicExperience.tsx 顶层组件，组装 Canvas + 世界 + Director
│   └── world/
│       ├── CinematicWorld.tsx  布置所有场景区域（复用现有美术资产）
│       └── (复用) ProceduralTrees/Terrain/Stream/MountainRange/DayNightCycle/PetalParticles/ChineseHouse
├── components/ui/
│   └── MainMenu.tsx            [改] 增加「开启讲解」按钮 → cinematic
└── store/useGameStore.ts       [改] SceneName 增加 'cinematic'
```

### 4.2 数据流

```
用户点「开启讲解」
  → useGameStore.setScene('cinematic')
  → SceneManager 渲染 <CinematicExperience/>
  → Director 加载 script.acts，开始计时
  → useFrame 每帧：
      1. 累积 elapsed
      2. 找当前 beat，计算 beat 内进度 t∈[0,1]
      3. lerp 相机 pos/lookAt/fov 到当前 beat 目标
      4. lerp 角色 pos/facing 到当前 beat 目标
      5. 触发旁白（beat 开始时若 narration 非空，调 Narrator.speak）
      6. 推进字幕（CaptionBar 按 beat 的 caption 打字机显示）
      7. 若 beat 开始且有 sfx，触发 AudioManager
      8. elapsed 超过当前 act 总时长 → advance 到下一 act
      9. 最后一 act 结束 → 停留在 ending 画面（可重播）
```

### 4.3 关键接口

**Director.ts**（纯逻辑，无 React/Three 依赖，可单测）：
```ts
class Director {
  constructor(acts: Act[])
  start(): void
  // 给定总 elapsed 秒，返回当前应处的状态快照
  sample(elapsed: number): DirectorState
  get currentActIndex(): number
  get isFinished(): boolean
}
interface DirectorState {
  actIndex: number
  beatIndex: number
  beatProgress: number        // 0..1 当前 beat 内进度
  camera: { pos: Vec3; lookAt: Vec3; fov: number }
  actor: { pos: Vec3; facing: number; action: string }
  caption: string | null
  narration: string | null
  narrationTrigger: string | null  // 仅在 beat 切换瞬间非空，触发一次朗读
  sfxTrigger: string | null        // 同上，触发一次音效
  title: string | null             // act 标题（仅 act 首帧）
}
```

**`sample()` 是纯函数式的**：输入 elapsed，输出状态快照，不持有 React state。这让它极易测试（见 §6）。

## 5. 剧本设计（script.ts）

按《桃花源记》原文分 **5 幕**，总时长约 4–5 分钟（课堂讲解适宜长度，可调）：

| 幕 | 标题 | 原文段落 | 视觉 | 时长 |
|----|------|----------|------|------|
| 1 | 缘溪行 | "晋太元中…忘路之远近" | 渔人驾舟顺溪而行，远山晨雾 | ~50s |
| 2 | 忽逢桃林 | "忽逢桃花林…落英缤纷" | 镜头推近成片桃林，花瓣纷飞 | ~55s |
| 3 | 穷林入山 | "复前行…便舍船从口入" | 弃舟登岸，步入幽暗山洞 | ~45s |
| 4 | 豁然开朗 | "初极狭…屋舍俨然" | 出洞见村庄，良田美池桑竹 | ~70s |
| 5 | 此中人语 | "阡陌交通…不足为外人道也" | 村民往来，渔人与老翁对谈，尾声 | ~60s |

每幕 3–6 个 beat，beat 的 camera/actor 字段精确编排镜头语言（推、拉、摇、跟）。原文做字幕主体，关键句配白话旁白。

**节奏原则**：每句原文给足停留（让学生看清字幕），旁白语速适中，镜头缓慢平稳（电影感，不晕）。

## 6. 测试策略

遵循 TDD（test-driven-development skill）。

**可单测的纯逻辑**：
- `Director.sample(elapsed)`：给定时间返回正确 act/beat/进度 — 多个边界用例
- 剧本数据校验：所有 beat 的 `at + duration` 单调递增、无重叠、无负值
- 相机插值：在 beat 边界应精确等于目标值，中间应平滑

**测试框架**：用 vitest（轻量，与 vite 集成）。新增 devDependency。

**不可单测的（视觉/音频）**：通过 `npm run build` + 手动 dev 烟雾测试 + verification-before-completion 清单验证。

## 7. 错误处理与降级

| 风险 | 降级策略 |
|------|----------|
| 浏览器不支持 Web Speech | Narrator 检测后静默，字幕仍完整 |
| 某幕美术加载失败 | 美术资产均为程序化几何体，无外部资源，不会加载失败 |
| 低性能设备掉帧 | Director 用真实 elapsed（不假设固定帧率），掉帧只会变慢不会错乱；可加 `prefers-reduced-motion` 检测降低粒子 |
| 屏幕比例异常 | Canvas 全屏自适应，字幕条用响应式定位 |

## 8. 非目标（YAGNI，明确不做）

- ❌ 不做交互式探索（那是现有模式的事）
- ❌ 不做玩家选择/多结局（电影是线性的）
- ❌ 不做战斗/技能（与课文无关）
- ❌ 不做多语言（只需中文）
- ❌ 不做云存档/账号系统
- ❌ 不做真实寻仙模型导入（无资源、风险高）
- ❌ 不改 InkWashEffect（水墨风已很好，直接用）

## 9. 验收标准（verification-before-completion）

1. ✅ `npm run build` 通过，无 TS 错误
2. ✅ `npm run dev` 启动，主菜单有「开启讲解」按钮
3. ✅ 点击后进入电影模式，**无需任何后续操作**即可从头播到尾
4. ✅ 角色可见（第三人称渔人），有行走/待机动作
5. ✅ 镜头会随剧情切换（推拉摇跟），不是静止画面
6. ✅ 字幕同步显示原文，可读
7. ✅ 语音旁白播放（支持的浏览器），可静默降级
8. ✅ 覆盖《桃花源记》主要段落
9. ✅ 播完后有明确结尾，可重播或返回菜单
10. ✅ 现有探索模式未被破坏（「进入桃花源」按钮仍可用）

## 10. 风险与缓解

| 风险 | 概率 | 缓解 |
|------|------|------|
| 时间不够（到 9 点） | 中 | 优先 P0：先做最小可播放版本（相机+角色+字幕+原文），P1/P2 逐级加；每完成一个里程碑都 `build` 验证，保证随时有可演示版本 |
| toon 角色效果不佳 | 中 | 先做最简可用（胶囊+toon材质+描边），效果不够再加衣袂/斗笠；时间允许才优化 |
| Web Speech 中文音色差 | 低 | 降级方案成熟（字幕为主），不影响演示 |
| 世界坐标布局复杂 | 低 | 先线性布局（溪→林→洞→村沿 z 轴排开），验证通过再美化 |

## 11. 实现顺序（里程碑制，每步可演示）

1. **M1 基础设施**：Director 纯逻辑 + TDD 测试 + types + 最小 script（2 个 beat）
2. **M2 可见骨架**：CinematicExperience + 单 Canvas + 相机插值 + 一个方块当角色 → 能看到镜头动
3. **M3 角色**：Actor 程序化渔人 + toon + 描边 + 走/待机动作
4. **M4 世界**：CinematicWorld 复用美术资产，布置 5 个区域
5. **M5 完整剧本**：script.ts 写满 5 幕所有 beat
6. **M6 字幕+语音**：CaptionBar 打字机 + Narrator Web Speech
7. **M7 接线**：MainMenu 加按钮 + store/SceneManager 路由
8. **M8 验收**：build + dev 测试 + verification 清单逐项核对

每个里程碑结束都 `git commit`，保证可回滚。
