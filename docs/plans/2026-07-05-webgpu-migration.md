# WebGPU 迁移记录 (2026-07-05)

## 背景
项目原本是 React 18 + R3F v8 + three 0.171 + WebGLRenderer。
确认目标应是 WebGPU 后，一次性全迁到 React 19 + R3F v9 + three 0.184 + WebGPURenderer。

## 完成的变更

### 依赖升级 (阶段 A)
| 包 | 旧 | 新 |
|---|---|---|
| react / react-dom | 18.3.1 | 19.2.7 |
| @react-three/fiber | 8.18 | 9.6.1 |
| @react-three/drei | 9.122 | 10.7.7 |
| @react-three/rapier | 1.5 | 2.2.0 |
| three / @types/three | 0.171 | **0.184.0** (钉死，TSL 跨版本会 break) |
| @react-three/postprocessing | 2.16 | **删除** (不兼容 WebGPU) |

### 渲染器切换 (阶段 B)
- `src/engine/createRenderer.ts`: 共享的 async WebGPU renderer factory
- 4 个 `<Canvas>` 全改 `gl={createRenderer(...)}` async factory
- `await renderer.init()` 必须 (WebGPU adapter 异步获取)
- `WebGPURenderer` 自动 fallback 到 WebGL2 (Safari < 17.4 / 旧移动端)
- `main.tsx` 加 `extend(THREE)` 注册所有 webgpu 类
- `global.d.ts` 改 React.JSX namespace + ThreeToJSXElements
- 全代码库 `from 'three'` → `from 'three/webgpu'` (42 文件)

### Shader 重写为 TSL (阶段 C)
| 文件 | 原 (GLSL) | 新 (TSL) |
|---|---|---|
| SkyDome | shaderMaterial 渐变 | meshBasicNodeMaterial + colorNode |
| Smoke | shaderMaterial point sprite | pointsNodeMaterial + TSL positionNode/alphaNode |
| billboardInstanced | shaderMaterial 圆柱 billboard | meshStandardNodeMaterial + grassSway positionNode (SeedThree grass.js 范式) |
| WindShader | onBeforeCompile GLSL | NodeMaterial.positionNode (TSL Fn) |
| SeedThree bark | (我之前的 onBeforeCompile GLSL 版已删) | MeshStandardNodeMaterial + barkWindPosition (SeedThree 原生 TSL) |
| SeedThree foliage | (同上已删) | MeshSSSNodeMaterial + dome normalNode + thicknessColorNode SSS + foliageWindPosition (SeedThree 原生 TSL) |
| **InkWashEffect** | WebGLRenderTarget + 265 行 GLSL | **PostProcessing + TSL Fn** (hash/noise/fbm/worley + Sobel edge + layered wash + fly-white + vignette) |

### 后处理重写 (阶段 D)
- `@react-three/postprocessing` 全删
- PostFX 用 `three/webgpu` 的 `PostProcessing` + TSL display 节点:
  - `bloom` from `three/addons/tsl/display/BloomNode.js`
  - `dof` from `DepthOfFieldNode.js`
  - `smaa` from `SMAANode.js`
  - 自定义 `colorGrade` Fn (brightness/contrast/saturation)
  - 自定义 `applyVignette` Fn
  - **N8AO 丢失** (GTAONode 需要 depth+normal 显式接线，未集成；可接受)
- 8 幕 PRESETS 调色弧保留

## ⚠️ 高风险验证点 (浏览器调试优先级)

以下是迁移中我无法在终端验证的部分，**你回到电脑后必须按此清单逐项检查**：

### P0 (阻塞性 — 不通过则黑屏/崩溃)
1. **WebGPU 上下文初始化** — `npm run dev` 在 Chrome 打开，看控制台是否有 WebGPU adapter 错误。fallback 到 WebGL2 的话看是否有 TSL→GLSL 编译错误。
2. **InkWashEffect PostProcessing 集成** — 我用了 `postRef.current?.render()` 在 useFrame 里手动驱动。**R3F v9 是否允许 PostProcessing 这样接管渲染循环我不确定**。如果水墨效不出现或场景黑屏，这是首要嫌疑。可能需要改用 R3F 的 outputNode 配置或 RenderPipeline 模式。
3. **PostFX 同样的 PostProcessing 集成问题** — 同上。
4. **dof() 调用签名** — 我用了 `dof(chain, chain.viewZ, ...)`，但 `chain.viewZ` 是否存在/正确我不确定。DoF 可能需要调整。

### P1 (视觉错误但不崩溃)
5. **SeedThree 桃树渲染** — bark/foliage 用 SeedThree 原生 TSL。几何+骨架已通过单元测试（无 NaN），但 TSL 节点在浏览器的实际渲染需验证。重点看：dome normal 是否消除卡片割裂、SSS 透光是否正确、风动画相位是否对。
6. **billboard 草地** — 改成了 SeedThree grass.js 范式（crossed quad + 上设法线 + grassSway）。但 `GroundCover` 的几何还是单个 `planeGeometry`，**没有改成 crossed quads + 随机朝向**。这会导致草看起来不对（所有草同朝向、没有交叉面）。需要在 GroundCover 里改几何。
7. **Smoke 粒子** — `pointsNodeMaterial` 的 `positionNode`/`alphaNode`/`colorNode` 接口是猜的，WebGPU 下 Points 的渲染行为可能与 WebGL 不同。
8. **WindShader (角色衣服)** — `positionLocal.add(displacement)` 作为 positionNode，但 displacement 里读了 `positionLocal.y`——在 positionNode 求值时 positionLocal 是否已就绪需验证。

### P2 (已知接受)
9. **N8AO 丢失** — cinematic 暗部会发平（已接受）
10. **SMAA** — 用了 SMAANode，应该工作
11. **shadows** — WebGPU 阴影已知有 bug (three #26830 #33048)，DayNightCycle/CinematicWorld 的阴影可能需调
12. **DataTexture RedFormat** (`npcParts.tsx:17`) — WebGPU 下 swizzle 可能不同
13. **InstancedMesh + TSL** — billboard/foliage 是已知 gotcha 点

## 客观验证状态 (终端可验证)
- ✅ TypeScript 严格模式编译干净
- ✅ 48/48 单元测试通过 (含 SeedThree 17 个)
- ✅ `npm run build` 成功 (2.95s)
- ❌ 浏览器运行时验证 — **未做** (我无法在终端跑 WebGPU)

## 文件清单
新增:
- `src/engine/createRenderer.ts`
- `src/components/world/seedthree/shaders/wind.ts` (TSL wind 系统)
- `src/components/world/seedthree/shaders/barkMaterial.ts`
- `src/components/world/seedthree/shaders/foliageMaterial.ts`

删除:
- `src/components/world/seedthree/shaders/barkShader.ts` (旧 GLSL 版)
- `src/components/world/seedthree/shaders/foliageShader.ts` (旧 GLSL 版)
- `src/components/world/seedthree/shaders/windUniforms.ts` (旧 GLSL 工具)

重写 (GLSL → TSL):
- `src/components/world/SkyDome.tsx`
- `src/components/world/village/Smoke.tsx`
- `src/components/world/shaders/billboardInstanced.ts`
- `src/cinematic/WindShader.ts`
- `src/components/world/InkWashEffect.tsx` (最大重写)
- `src/cinematic/PostFX.tsx`
- `src/components/world/seedthree/bake/impostor.ts` (WebGL → WebGPU RT API)
- `src/components/world/seedthree/SingleTree.ts` (适配新 material builder)
- `src/components/world/seedthree/SeedTreeLod.ts` (同上)
- `src/components/world/seedthree/SeedThreeForest.tsx` (移除手动 sun 遍历)

配置:
- `package.json` — 依赖升级
- `src/main.tsx` — extend(THREE)
- `src/global.d.ts` — React.JSX namespace
- `vite.config.ts` — 移除 postprocessing chunk
- `README.md` — WebGL → WebGPU 措辞

## 后续工作 (验证后)
1. 按 P0/P1 清单浏览器调试
2. 修 GroundCover 几何为 crossed quads
3. 考虑集成 GTAONode (需 depth+normal 接线)
4. 性能 benchmark (WebGPU 在某些负载比 WebGL 慢)
5. 移动端 Safari WebGL2 fallback 测试
