# 桃花源记 — 互动沉浸式 3D 体验

基于 WebGPU 技术（WebGL2 自动回退），以第一人称视角重走陶渊明《桃花源记》：漫游桃花林、穿越山洞、探访世外桃源，并在「留」与「归」之间做出选择。

## 体验流程

1. **主菜单** — 进入体验
2. **开场** — 原文节选打字呈现
3. **桃花林** — 自由探索，寻找山洞（WASD + 鼠标，按 E 进入）
4. **穿洞** — 过渡动画「豁然开朗」
5. **桃源村** — 与村民对话，了解此地故事
6. **尾声**（回归路线）— 「遂迷，不复得路」
7. **结局** — 根据选择呈现不同收束

## 操作

| 平台 | 移动 | 视角 | 互动 |
|------|------|------|------|
| 桌面 | WASD / 方向键 | 鼠标（点击锁定） | E |
| 移动 | 左下虚拟摇杆 | 右侧滑动 | 互动按钮 |

Shift 可奔跑；空格可跳跃（桃花林/村落场景）。

## 在线体验

合并到 `master` 后，GitHub Actions 会自动部署到：

https://reed-soul.github.io/peach-blossom-spring/

（需在仓库 Settings → Pages 中选择 **GitHub Actions** 作为来源。）

## 本地开发

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 生产构建
npm test         # 单元测试
```

构建叙事脚本（修改 `content/narrative/*.ink` 后）：

```bash
npm run narrative:build
```

会编译 `content/narrative/` 下全部 `.ink` 文件到 `src/narrative/*.json`。

## 技术栈

- **React 18** + **TypeScript** + **Vite**
- **Three.js** / **React Three Fiber** — 3D 渲染
- **Rapier** — 物理与碰撞
- **inkjs** — 分支叙事脚本
- **Zustand** — 游戏状态
- 自定义水墨后处理 shader、程序化地形与桃花树

## 项目结构

```
src/
  components/scenes/   # 各场景（菜单、桃花林、村落…）
  components/world/    # 共享 3D 世界元素
  engine/              # 场景管理、玩家控制、音频、导航
  narrative/           # ink 叙事运行时
  store/               # 全局状态
content/narrative/     # ink 源文件（opening / village / epilogue / endings）
```

## 许可证

Private — 教育/展示用途。
