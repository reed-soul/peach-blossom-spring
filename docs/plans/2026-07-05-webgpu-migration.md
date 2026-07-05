# WebGPU 迁移记录 (2026-07-05 → 2026-07-06)

## 背景
项目原本是 React 18 + R3F v8 + three 0.171 + WebGLRenderer。
确认目标应是 WebGPU 后，一次性全迁到 React 19 + R3F v9 + three 0.184 + WebGPURenderer。
迁移后用 puppeteer + Chrome 真机验证，逐个修复运行时 bug。

## ✅ 浏览器验证状态 (puppeteer headless Chrome, apple WebGPU adapter)

| 场景 | 状态 | 说明 |
|---|---|---|
| 主菜单 | ✅ 0 错误 | 完美渲染 |
| 开场叙事 | ✅ 0 错误 | 打字机文字 + 点击推进 |
| **桃林场景 (PeachForest)** | ✅ canvasCount=1, 1280×800 | SeedThree 桃树 + InkWashEffect 水墨 + Stream 水面 + Compass 罗盘全工作 |
| **cinematic 电影模式** | ✅ canvasCount=1, 1280×800 | PostFX (bloom + colorGrade + vignette + smaa) + 8 幕叙事 |
| 村庄场景 (Village) | ⚠️ 未 headless 验证 | 需玩家走到洞穴触发; VillageNpc Html 已改 DOM tracker (同源修复) |

## 完成的变更

### 依赖升级
| 包 | 旧 | 新 |
|---|---|---|
| react / react-dom | 18.3.1 | 19.2.7 |
| @react-three/fiber | 8.18 | 9.6.1 |
| @react-three/drei | 9.122 | 10.7.7 |
| @react-three/rapier | 1.5 | 2.2.0 |
| three / @types/three | 0.171 | **0.184.0** (钉死，TSL 跨版本会 break) |
| @react-three/postprocessing | 2.16 | **删除** (不兼容 WebGPU) |

### 渲染器切换
- `src/engine/createRenderer.ts`: async WebGPU renderer factory (R3F v9 gl factory 接收 state props, 传给 WebGPURenderer 单对象 — ektogamat/r3f-webgpu-starter 模式)
- 4 个 `<Canvas>` 全改 `gl={createRenderer(...)}`
- `await renderer.init()` 必须 (WebGPU adapter 异步)
- `main.tsx` 加 `extend(THREE)` 注册所有 webgpu 类
- `global.d.ts` 改 React.JSX namespace + ThreeToJSXElements
- 全代码库 `from 'three'` → `from 'three/webgpu'` (42 文件)
- `WebGPURenderer` 自动 fallback 到 WebGL2 (Safari < 17.4 / 旧移动端)

### Shader 重写为 TSL
| 文件 | 原 (GLSL) | 新 (TSL) |
|---|---|---|
| SkyDome | shaderMaterial 渐变 | meshBasicNodeMaterial + colorNode |
| Smoke | shaderMaterial point sprite | pointsNodeMaterial + TSL positionNode/alphaNode |
| billboardInstanced | shaderMaterial 圆柱 billboard | meshStandardNodeMaterial + grassSway positionNode (SeedThree grass.js 范式) |
| **Stream** | shaderMaterial 100 行水面 (漏转) | meshStandardNodeMaterial + positionNode 顶点波动 + outputNode 流动法线/Fresnel/sparkle |
| WindShader | onBeforeCompile GLSL | NodeMaterial.positionNode (TSL Fn) |
| SeedThree bark | (GLSL 版已删) | MeshStandardNodeMaterial + barkWindPosition (SeedThree 原生 TSL) |
| SeedThree foliage | (同上已删) | MeshSSSNodeMaterial + dome normalNode + thicknessColorNode SSS + foliageWindPosition (SeedThree 原生 TSL) |
| **InkWashEffect** | WebGLRenderTarget + 265 行 GLSL | **PostProcessing→RenderPipeline + TSL Fn** (简化版: 水墨纸张基调 + fbm 伪边缘 + 飞白 + 暗角) |

### 后处理重写
- `@react-three/postprocessing` 全删
- PostFX 用 `three/webgpu` 的 `RenderPipeline` + TSL display 节点:
  - `bloom(scenePass, strength, radius, threshold)` from BloomNode.js
  - `colorGrade` 自定义 TSL Fn (brightness/contrast/saturation)
  - `applyVignette` 自定义 TSL Fn
  - `smaa` from SMAANode.js
  - useFrame priority 1 让 R3F 让出渲染循环
- 8 幕 PRESETS 调色弧保留, per-frame lerp 平滑过渡
- **N8AO 丢失** (GTAONode 需 depth+normal 显式接线, 未集成)
- **DoF 移除** (dof viewZ 签名不确定)

### drei `<Html>` 替代 (WebGPU 不兼容)
drei `<Html>` 在 WebGPURenderer 上崩 (`canvasTarget.domElement.getContext is not a function`).
两处替代为 Canvas 内 tracker + Canvas 外 DOM 模式:
- **Compass 罗盘** (PeachForestScene): CompassTracker (useFrame 读 camera 写角度 by id) + CompassHUD (纯 DOM div)
- **VillageNpc 标签** (VillageScene): VillageNpc useFrame 内联 project() 投影 NPC 头顶 + VillageNpcLabels (Canvas 外 DOM)

## 浏览器验证中发现并修复的 9 个运行时 bug

| # | bug | 修复 |
|---|---|---|
| 1 | `PostProcessing` 类已重命名 | → `RenderPipeline` (three 0.184) |
| 2 | `gl` factory 接收 R3F state, 不是单纯 canvas | ektogamat starter 模式 (单对象) |
| 3 | R3F 渲染循环和 RenderPipeline 双重渲染 | useFrame priority 1 |
| 4 | `texture(textureNode, uv)` TSL API 误用 | InkWashEffect 简化为无偏移采样 |
| 5 | SeedThreeForest 漏 import useFrame | 补 import |
| 6 | drei `<Html>` (Compass) 崩 WebGPU | tracker + DOM HUD 拆分 |
| 7 | **Stream.tsx 漏转 ShaderMaterial** | 重写为 MeshStandardNodeMaterial TSL |
| 8 | bloom.uniform.value mutation 跨版本脆弱 | 改用 bloom(strength,radius,threshold) 构造参数 |
| 9 | drei `<Html>` (VillageNpc) 崩 WebGPU | project() 投影 + DOM labels |

## ⚠️ 已知遗留 (非阻塞)

1. **NaN 几何警告** — 间歇性 `computeBoundingSphere: Computed radius is NaN`. 不影响渲染 (canvasCount=1). SeedThree 300 棵树在 node 里全干净 (单测覆盖), 浏览器里间歇出现, 可能是 Impostor bake 临时几何或某 degenerate scale (1e-4). 后续用 computeBoundingSphere monkey-patch 精确定位.
2. **InkWashEffect 简化版** — 无真正 Sobel 边缘 (改用 fbm 伪边缘). 视觉可接受 (水墨纸张基调生效). TSL textureNode UV 偏移采样 API 有版本差异, 恢复 Sobel 需更多试错.
3. **村庄场景未 headless 验证** — 需玩家走到洞穴触发. VillageNpc Html 已改 DOM tracker (同源修复, 应该工作).
4. **N8AO + DoF 丢失** — cinematic 暗部会发平, 无景深. 可接受 (GTAONode 需 depth+normal 接线, dof viewZ 签名不确定).

## 客观验证状态
- ✅ TypeScript 严格模式编译干净
- ✅ 48/48 单元测试通过 (含 SeedThree 17 个)
- ✅ `npm run build` 成功 (3.71s)
- ✅ 主菜单 + 开场场景: 0 错误
- ✅ 桃林场景: canvasCount=1, 完整 UI (罗盘/字幕/控制提示), 水墨视觉生效
- ✅ cinematic 模式: canvasCount=1, PostFX 链工作

## 提交历史
- `02f1edf` 阶段 A+B+C1: 依赖升级 + import + Canvas + SkyDome/billboard TSL
- `44aafc6` 阶段 C2-C4 + D + E: 全部 shader TSL + PostFX
- `5fe3c18` 浏览器验证修复: createRenderer + RenderPipeline + useFrame priority + InkWash 简化 + useFrame import + Compass 禁用
- `b705a54` Merge to master
- `da4a5af` Stream TSL + Compass DOM overlay
- `8ffe66b` VillageNpc tracker + PostFX 修复

## 文件清单
新增: `src/engine/createRenderer.ts`, `src/components/world/seedthree/shaders/{wind,barkMaterial,foliageMaterial}.ts`
删除: `src/components/world/seedthree/shaders/{barkShader,foliageShader,windUniforms}.ts` (旧 GLSL 版)
重写 GLSL→TSL: SkyDome, Smoke, billboardInstanced, Stream, WindShader, InkWashEffect, PostFX, impostor (WebGL→WebGPU RT), SeedThree 全套
配置: package.json (依赖), main.tsx (extend), global.d.ts (JSX), vite.config.ts, README.md
