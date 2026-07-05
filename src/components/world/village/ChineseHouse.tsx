import { useMemo } from 'react'
import * as THREE from 'three/webgpu'
import type { ReactNode } from 'react'
import { PbrTextures } from '../../../cinematic/textures/PbrTextures'

// ─────────────────────────────────────────────────────────────
// 程序化瓦片贴图：深灰弧形瓦片叠排，深色描边
// 用 CanvasTexture，避免新增外部资产
// ─────────────────────────────────────────────────────────────
let tileTex: THREE.CanvasTexture | null = null
function getTileTexture(): THREE.CanvasTexture {
  if (tileTex) return tileTex
  const w = 256
  const h = 256
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  // 底色（瓦片间的缝隙，深褐）
  ctx.fillStyle = '#2a1a12'
  ctx.fillRect(0, 0, w, h)
  // 半圆瓦片：每行错开半片，模拟鱼鳞瓦叠排
  const rows = 8
  const cols = 8
  const tileW = w / cols
  const tileH = h / rows
  for (let r = 0; r < rows; r++) {
    const offsetX = (r % 2) * (tileW * 0.5)
    for (let cI = -1; cI < cols + 1; cI++) {
      const cx = cI * tileW + offsetX + tileW * 0.5
      const cy = r * tileH + tileH * 0.5
      // 瓦片本体：半圆，渐变（上亮下暗，模拟弧面高光）
      const grad = ctx.createRadialGradient(cx, cy - tileH * 0.2, tileW * 0.1, cx, cy, tileW * 0.55)
      // 瓦片颜色微变（灰褐系，每片随机偏色）
      const v = 0.85 + Math.sin(cI * 3.1 + r * 1.7) * 0.1
      const base = Math.floor(70 * v)
      grad.addColorStop(0, `rgb(${base + 30},${base + 22},${base + 14})`)
      grad.addColorStop(0.7, `rgb(${base},${base - 8},${base - 16})`)
      grad.addColorStop(1, `rgb(${Math.max(0, base - 25)},${Math.max(0, base - 30)},${Math.max(0, base - 32)})`)
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.ellipse(cx, cy + tileH * 0.3, tileW * 0.5, tileH * 0.85, 0, Math.PI, 0)
      ctx.fill()
      // 瓦片描边（加深缝隙）
      ctx.strokeStyle = 'rgba(15,8,4,0.5)'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }
  tileTex = new THREE.CanvasTexture(c)
  tileTex.wrapS = THREE.RepeatWrapping
  tileTex.wrapT = THREE.RepeatWrapping
  tileTex.colorSpace = THREE.SRGBColorSpace
  tileTex.anisotropy = 8
  return tileTex
}

// ─────────────────────────────────────────────────────────────
// 中式民居：悬山顶双坡屋顶 + 挑檐 + 正脊垂脊 + 砖墙 + 门窗凹陷 + 石基台阶
// 相比原 4 棱锥"积木"，几何更贴近真实汉晋民居
// ─────────────────────────────────────────────────────────────

export function ChineseHouse({
  position,
  rotation = 0,
  scale = 1,
  wallColor = 0xf5e6d0,
}: {
  position: [number, number, number]
  rotation?: number
  scale?: number
  wallColor?: number
}) {
  const brickMap = useMemo(() => PbrTextures.brick([2, 1]), [])
  const woodMap = useMemo(() => PbrTextures.wood([3, 3]), [])
  const woodRough = useMemo(() => PbrTextures.woodRough([3, 3]), [])
  const tileMap = useMemo(() => {
    const t = getTileTexture()
    t.repeat.set(2, 2)
    return t
  }, [])
  // 屋顶独立 repeat 实例（避免与其它实例冲突）
  const tileMapRoof = useMemo(() => {
    const t = getTileTexture()
    t.repeat.set(3, 2)
    return t
  }, [])

  // 几何参数
  const W = 4 // 墙宽（沿 x）
  const D = 3 // 墙深（沿 z）
  const H = 3 // 墙高
  const roofH = 1.6 // 屋顶高度
  const eaves = 0.7 // 挑檐外伸（四边超出墙体）

  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      {/* ===== 石基（比墙体宽一圈，模拟台基） ===== */}
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[W + 0.4, 0.3, D + 0.4]} />
        <meshStandardMaterial color={0x8a8275} roughness={0.95} />
      </mesh>

      {/* ===== 墙体（砖块贴图） ===== */}
      <mesh position={[0, H / 2 + 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial color={wallColor} map={brickMap} roughness={0.92} />
      </mesh>

      {/* ===== 屋顶：双坡悬山顶（沿 x 轴向延伸的脊） ===== */}
      {/* 屋顶用一个横向放置的三棱柱：底面是等腰三角形，沿 x 拉伸 */}
      {/* 挑檐：屋顶底面比墙体宽 2*eaves */}
      <group position={[0, H + 0.3, 0]}>
        {/* 屋顶主体：用 BufferGeometry 构造双坡面（人字形截面，沿 x 拉伸） */}
        <RoofGable width={W + eaves * 2} depth={D + eaves * 2} height={roofH} tileMap={tileMapRoof} />

        {/* 正脊（屋顶顶部沿 x 的横梁）：深色细长 box */}
        <mesh position={[0, roofH + 0.05, 0]} castShadow>
          <boxGeometry args={[W + eaves * 2 + 0.2, 0.18, 0.28]} />
          <meshStandardMaterial color={0x2a1810} roughness={0.9} />
        </mesh>
        {/* 正脊两端吻兽（简化为小方块） */}
        <mesh position={[-(W + eaves * 2) / 2 - 0.05, roofH + 0.15, 0]} castShadow>
          <boxGeometry args={[0.22, 0.3, 0.32]} />
          <meshStandardMaterial color={0x2a1810} roughness={0.9} />
        </mesh>
        <mesh position={[(W + eaves * 2) / 2 + 0.05, roofH + 0.15, 0]} castShadow>
          <boxGeometry args={[0.22, 0.3, 0.32]} />
          <meshStandardMaterial color={0x2a1810} roughness={0.9} />
        </mesh>

        {/* 山墙（屋顶两端 z 方向的三角形封墙，防风防鸟） */}
        <GableMesh width={W + eaves * 2} height={roofH} position={[0, roofH / 2, (D + eaves * 2) / 2]} material={
          <meshStandardMaterial color={wallColor} map={brickMap} roughness={0.92} side={THREE.DoubleSide} />
        } />
        <GableMesh width={W + eaves * 2} height={roofH} position={[0, roofH / 2, -(D + eaves * 2) / 2]} material={
          <meshStandardMaterial color={wallColor} map={brickMap} roughness={0.92} side={THREE.DoubleSide} />
        } />
      </group>

      {/* ===== 正面（z = +D/2）门 ===== */}
      {/* 门框（深色凹陷） */}
      <mesh position={[0, 1.4 + 0.3, D / 2 - 0.02]} castShadow>
        <boxGeometry args={[1.4, 2.8, 0.12]} />
        <meshStandardMaterial color={0x3a2410} roughness={0.9} map={woodMap} />
      </mesh>
      {/* 门板（两扇，木纹） */}
      <mesh position={[-0.32, 1.4 + 0.3, D / 2 + 0.04]} castShadow>
        <boxGeometry args={[0.6, 2.4, 0.06]} />
        <meshStandardMaterial color={0x6b3f1c} roughness={0.8} map={woodMap} roughnessMap={woodRough} />
      </mesh>
      <mesh position={[0.32, 1.4 + 0.3, D / 2 + 0.04]} castShadow>
        <boxGeometry args={[0.6, 2.4, 0.06]} />
        <meshStandardMaterial color={0x6b3f1c} roughness={0.8} map={woodMap} roughnessMap={woodRough} />
      </mesh>
      {/* 门钉（每扇门两排小铜钉） */}
      {[-0.32, 0.32].map((dx) =>
        [0, 1, 2, 3].map((row) => (
          <mesh key={`nail-${dx}-${row}`} position={[dx, 0.7 + row * 0.45 + 0.3, D / 2 + 0.08]}>
            <sphereGeometry args={[0.04, 8, 6]} />
            <meshStandardMaterial color={0xc9a24a} metalness={0.8} roughness={0.3} />
          </mesh>
        )),
      )}

      {/* ===== 正面窗（左右各一，带窗棂） ===== */}
      {[-1.3, 1.3].map((wx) => (
        <group key={`win-${wx}`} position={[wx, 1.9 + 0.3, D / 2 + 0.02]}>
          {/* 窗框 */}
          <mesh castShadow>
            <boxGeometry args={[0.9, 0.9, 0.08]} />
            <meshStandardMaterial color={0x3a2410} roughness={0.85} map={woodMap} />
          </mesh>
          {/* 窗棂：横竖细木条 */}
          {[-0.3, 0, 0.3].map((dy) => (
            <mesh key={`h-${wx}-${dy}`} position={[0, dy, 0.06]}>
              <boxGeometry args={[0.78, 0.04, 0.04]} />
              <meshStandardMaterial color={0x4a2810} roughness={0.85} />
            </mesh>
          ))}
          {[-0.3, 0, 0.3].map((dx2) => (
            <mesh key={`v-${wx}-${dx2}`} position={[dx2, 0, 0.06]}>
              <boxGeometry args={[0.04, 0.78, 0.04]} />
              <meshStandardMaterial color={0x4a2810} roughness={0.85} />
            </mesh>
          ))}
          {/* 窗后暗色（模拟室内幽暗） */}
          <mesh position={[0, 0, -0.04]}>
            <planeGeometry args={[0.82, 0.82]} />
            <meshStandardMaterial color={0x1a1a1a} roughness={1} />
          </mesh>
        </group>
      ))}

      {/* ===== 背面（z = -D/2）一扇小窗 ===== */}
      <group position={[0, 1.9 + 0.3, -D / 2 - 0.02]}>
        <mesh castShadow>
          <boxGeometry args={[0.9, 0.7, 0.08]} />
          <meshStandardMaterial color={0x3a2410} roughness={0.85} map={woodMap} />
        </mesh>
        <mesh position={[0, 0, -0.04]}>
          <planeGeometry args={[0.82, 0.62]} />
          <meshStandardMaterial color={0x1a1a1a} roughness={1} />
        </mesh>
      </group>

      {/* ===== 侧面（x = ±W/2）各一扇小高窗 ===== */}
      {[-1, 1].map((sx) => (
        <group key={`side-win-${sx}`} position={[sx * (W / 2) + sx * 0.02, 2.0 + 0.3, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.08, 0.6, 0.8]} />
            <meshStandardMaterial color={0x3a2410} roughness={0.85} map={woodMap} />
          </mesh>
          <mesh position={[sx * -0.04, 0, 0]}>
            <planeGeometry args={[0.62, 0.72]} />
            <meshStandardMaterial color={0x1a1a1a} roughness={1} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}

      {/* ===== 门前台阶（两级） ===== */}
      <mesh position={[0, 0.08, D / 2 + 0.3]} receiveShadow castShadow>
        <boxGeometry args={[1.8, 0.16, 0.4]} />
        <meshStandardMaterial color={0x8a8275} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.04, D / 2 + 0.5]} receiveShadow castShadow>
        <boxGeometry args={[2.0, 0.08, 0.2]} />
        <meshStandardMaterial color={0x9a9285} roughness={0.95} />
      </mesh>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────
// 双坡屋顶几何：人字形截面（等腰三角形），沿 x 拉伸成三棱柱
// 用 BufferGeometry 手写，因为 BoxGeometry/ConeGeometry 做不出双坡
// ─────────────────────────────────────────────────────────────
function RoofGable({
  width,
  depth,
  height,
  tileMap,
}: {
  width: number
  depth: number
  height: number
  tileMap: THREE.Texture
}) {
  const geo = useMemo(() => {
    const hw = width / 2 // 半宽（含挑檐）
    const hd = depth / 2 // 半深（含挑檐）
    // 人字形截面顶点（在 yz 平面）：
    //   底左 (-hd, 0), 底右 (hd, 0), 顶 (0, height)
    // 沿 x 拉伸 -hw..hw
    const vertices = new Float32Array([
      // 前坡（朝 +z）：三角形，法线朝外
      -hw, 0, hd, hw, 0, hd, hw, height, 0,
      -hw, 0, hd, hw, height, 0, -hw, height, 0,
      // 后坡（朝 -z）
      -hw, 0, -hd, -hw, height, 0, hw, height, 0,
      -hw, 0, -hd, hw, height, 0, hw, 0, -hd,
      // 左山墙封顶（朝 -x）：三角形
      -hw, 0, -hd, -hw, 0, hd, -hw, height, 0,
      // 右山墙封顶（朝 +x）：三角形
      hw, 0, hd, hw, 0, -hd, hw, height, 0,
      // 屋檐底（朝下，封底面，可选但避免穿帮）
      -hw, 0, -hd, hw, 0, -hd, hw, 0, hd,
      -hw, 0, -hd, hw, 0, hd, -hw, 0, hd,
    ])
    const uvs = new Float32Array([
      // 前坡
      0, 0, width / 2, 0, width / 2, 1,
      0, 0, width / 2, 1, 0, 1,
      // 后坡
      0, 0, 0, 1, width / 2, 1,
      0, 0, width / 2, 1, width / 2, 0,
      // 左山墙
      0, 0, depth / 2, 0, depth / 2, 1,
      // 右山墙
      0, 0, depth / 2, 0, depth / 2, 1,
      // 底面
      0, 0, width / 2, 0, width / 2, depth / 2,
      0, 0, width / 2, depth / 2, 0, depth / 2,
    ])
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    g.computeVertexNormals()
    return g
  }, [width, depth, height])

  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshStandardMaterial
        map={tileMap}
        color={0x5a4a3a}
        roughness={0.85}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// 山墙三角形 mesh：用于屋顶两端的封墙
function GableMesh({
  width,
  height,
  position,
  material,
}: {
  width: number
  height: number
  position: [number, number, number]
  material: ReactNode
}) {
  const geo = useMemo(() => {
    const hw = width / 2
    const vertices = new Float32Array([-hw, 0, 0, hw, 0, 0, 0, height, 0])
    const uvs = new Float32Array([0, 0, 1, 0, 0.5, 1])
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    g.computeVertexNormals()
    return g
  }, [width, height])
  return (
    <mesh geometry={geo} position={position} castShadow receiveShadow>
      {material}
    </mesh>
  )
}

// ─────────────────────────────────────────────────────────────
// 灯笼：圆柱 + 流苏 + 暖光
// ─────────────────────────────────────────────────────────────
export function ChineseLantern({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.8, 12]} />
        <meshStandardMaterial color={0xcc0000} emissive={0x880000} emissiveIntensity={0.3} roughness={0.6} />
      </mesh>
      {/* 灯笼上下盖 */}
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.42, 0.4, 0.1, 12]} />
        <meshStandardMaterial color={0x2a1810} roughness={0.8} />
      </mesh>
      <mesh position={[0, -0.45, 0]}>
        <cylinderGeometry args={[0.42, 0.4, 0.1, 12]} />
        <meshStandardMaterial color={0x2a1810} roughness={0.8} />
      </mesh>
      {/* 流苏 */}
      <mesh position={[0, -0.6, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 0.3, 6]} />
        <meshStandardMaterial color={0xcc8800} roughness={0.9} />
      </mesh>
      <pointLight color={0xffd700} intensity={2} distance={8} />
    </group>
  )
}

// ─────────────────────────────────────────────────────────────
// 木桥
// ─────────────────────────────────────────────────────────────
export function VillageBridge({ position }: { position: [number, number, number] }) {
  const woodMap = useMemo(() => PbrTextures.wood([3, 1]), [])
  const woodRough = useMemo(() => PbrTextures.woodRough([3, 1]), [])
  return (
    <group position={position}>
      {/* 桥面 */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[4, 0.2, 1.5]} />
        <meshStandardMaterial color={0x5d4037} map={woodMap} roughnessMap={woodRough} roughness={0.85} />
      </mesh>
      {/* 桥栏立柱 */}
      {[-1.8, -0.6, 0.6, 1.8].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.85, 0.7]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.7, 8]} />
            <meshStandardMaterial color={0x5d4037} map={woodMap} roughness={0.85} />
          </mesh>
          <mesh position={[x, 0.85, -0.7]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.7, 8]} />
            <meshStandardMaterial color={0x5d4037} map={woodMap} roughness={0.85} />
          </mesh>
        </group>
      ))}
      {/* 横栏 */}
      <mesh position={[0, 1.1, 0.7]} castShadow>
        <boxGeometry args={[4, 0.08, 0.06]} />
        <meshStandardMaterial color={0x5d4037} map={woodMap} roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.1, -0.7]} castShadow>
        <boxGeometry args={[4, 0.08, 0.06]} />
        <meshStandardMaterial color={0x5d4037} map={woodMap} roughness={0.85} />
      </mesh>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────
// 村庄桃树：树冠用多个偏移球叠加（打破规则球体感）+ 高分段
// ─────────────────────────────────────────────────────────────
export function VillagePeachTrees({ centerZ = -8 }: { centerZ?: number }) {
  const trees = useMemo(
    () =>
      Array.from({ length: 24 }).map((_, i) => {
        const angle = (i / 24) * Math.PI * 2
        const r = 22 + Math.sin(i * 4.7) * 5
        return {
          x: Math.cos(angle) * r,
          z: Math.sin(angle) * r + centerZ,
          scale: 0.8 + Math.sin(i * 2.3) * 0.3,
        }
      }),
    [centerZ],
  )

  // 每棵树 3 个偏移球簇的位置（相对树干顶部）
  const clusters = useMemo(
    () => [
      { p: [0, 0, 0] as [number, number, number], s: 1.0 },
      { p: [0.9, 0.3, 0.2] as [number, number, number], s: 0.75 },
      { p: [-0.7, 0.2, -0.5] as [number, number, number], s: 0.8 },
      { p: [0.1, 0.8, -0.3] as [number, number, number], s: 0.65 },
    ],
    [],
  )

  return (
    <>
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} scale={t.scale}>
          {/* 树干 */}
          <mesh position={[0, 2.5, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.25, 5, 10]} />
            <meshStandardMaterial color={0x5d4037} roughness={0.95} />
          </mesh>
          {/* 树冠：多个偏移球叠加，高分段，颜色微变 */}
          {clusters.map((c, ci) => {
            const v = 0.85 + Math.sin(i * 2.1 + ci * 1.3) * 0.15
            const r = Math.floor(0xff * v)
            const g = Math.floor(0xb7 * v)
            const b = Math.floor(0xc5 * v)
            return (
              <mesh key={ci} position={[c.p[0], 5.5 + c.p[1], c.p[2]]} scale={c.s * (1.6 + Math.sin(i + ci) * 0.3)} castShadow>
                <sphereGeometry args={[2, 16, 12]} />
                <meshStandardMaterial color={(r << 16) | (g << 8) | b} roughness={0.8} />
              </mesh>
            )
          })}
        </group>
      ))}
    </>
  )
}
