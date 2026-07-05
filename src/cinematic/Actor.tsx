import { useRef, useMemo, Component, ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three/webgpu'
import type { ActorAction } from './types'
import { applyWind, tickWindMaterials } from './WindShader'
import { getBeltPattern } from './textures'
import { getTerrainHeight } from '../components/world/Terrain'

function lerpScalar(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// ─────────────────────────────────────────────────────────────
// 仙侠风渔人：宽袍广袖 · 交领 · 长发 · 束发冠 · 飘带 · 玉佩
// 用 MeshStandardMaterial（PBR）保证颜色在所有 GPU 上鲜艳一致；
// 飘动用顶点着色器（onBeforeCompile）；描边用背面法线外扩。
// ─────────────────────────────────────────────────────────────

// PBR 布料材质：指定颜色 + 织物法线感（roughness 偏高，模拟哑光布）
function useClothMat(color: string, roughness = 0.88) {
  return useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness,
      metalness: 0.0,
    })
  }, [color, roughness])
}

// 描边 mesh：复制几何，放大 + 背面 + 黑色
function Outline({
  children,
  scale = 1.045,
}: {
  children: React.ReactNode
  scale?: number
}) {
  return (
    <mesh scale={[scale, scale, scale]} renderOrder={-1}>
      {children}
      <meshBasicMaterial color="#2a1a10" side={THREE.BackSide} />
    </mesh>
  )
}

// 一个部件：本体（toon）+ 描边，挂在同一 group
function Part({
  geom,
  mat,
  position,
  rotation,
  scale,
  outline = 1.045,
}: {
  geom: React.ReactNode
  mat: THREE.Material
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
  outline?: number
}) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh material={mat} castShadow>
        {geom}
      </mesh>
      <Outline scale={outline}>{geom}</Outline>
    </group>
  )
}

export interface ActorProps {
  posRef: React.MutableRefObject<[number, number, number]>
  facingRef: React.MutableRefObject<number>
  actionRef: React.MutableRefObject<ActorAction>
  onStep?: () => void
}

export function ActorProcedural({ posRef, facingRef, actionRef, onStep }: ActorProps) {
  const root = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const neck = useRef<THREE.Group>(null) // 分层：颈→头（头部可独立微点，分层呼吸）
  const robeGroup = useRef<THREE.Group>(null)
  const leftSleeve = useRef<THREE.Group>(null)
  const rightSleeve = useRef<THREE.Group>(null)
  const hairBack = useRef<THREE.Mesh>(null)
  const sashL = useRef<THREE.Mesh>(null)
  const sashR = useRef<THREE.Mesh>(null)
  const tRef = useRef(0)
  const lastStepSign = useRef(1) // 脚步触发：检测 swing 正弦过零点
  // 动作 blend：缓存当前各关节角度，lerp 到目标，消除 action 间硬切
  const blended = useRef({
    bodyY: 0, bodyRotZ: 0, bodyRotX: 0,
    neckRotX: 0,
    leftArmX: 0.15, rightArmX: 0.15,
  })

  // 配色（仙侠青衫文人）— 用 PBR 材质保证颜色鲜艳
  const mRobe = useClothMat('#3a6e7a') // 外袍青
  const mSleeve = useClothMat('#3a6e7a') // 广袖（同色但独立风参数）
  const mInner = useClothMat('#ede4d0') // 内衫米白
  const mBelt = useClothMat('#4a3220') // 腰带深褐
  const mSkin = useClothMat('#f2d2ac', 0.65) // 肤色（皮肤比布料更光滑）
  const mHair = useClothMat('#1a1612', 0.7) // 发色
  const mCrown = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#c9a24a', metalness: 0.85, roughness: 0.25, emissive: new THREE.Color('#3a2810'), emissiveIntensity: 0.15 }),
    [],
  )
  const mBoot = useClothMat('#241c16', 0.7)

  // 腰带回纹暗花（emissiveMap，低强度）
  useMemo(() => {
    const belt = getBeltPattern()
    mBelt.emissive = new THREE.Color('#3a2810')
    mBelt.emissiveMap = belt
    mBelt.emissiveIntensity = 0.25
    mBelt.needsUpdate = true
  }, [mBelt])
  const mJade = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#5fa88a', metalness: 0.3, roughness: 0.4 }),
    [],
  )
  const mSash = useClothMat('#7a3030') // 飘带暗红

  // 飘动部件的描边材质（黑色背面 + 同样的风参数，确保描边跟随本体飘动）
  const mRobeOutline = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({ color: '#2a1a10', side: THREE.BackSide })
    applyWind(m, { axis: 'y-', pivot: 0.55, amount: 0.14, speed: 1.1, phase: 0.0, swayX: 1.0, swayZ: 0.5 })
    return m
  }, [])
  const mSleeveOutline = useMemo(() => {
    // 袖子描边：无风（袖子靠 group 旋转摆动）
    return new THREE.MeshBasicMaterial({ color: '#2a1a10', side: THREE.BackSide })
  }, [])
  const mSashOutline = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({ color: '#2a1a10', side: THREE.BackSide })
    applyWind(m, { axis: 'y-', pivot: 0.5, amount: 0.22, speed: 1.4, phase: 1.2, swayX: 1.2, swayZ: 0.7 })
    return m
  }, [])
  const mHairOutline = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({ color: '#2a1a10', side: THREE.BackSide })
    applyWind(m, { axis: 'y-', pivot: 1.55, amount: 0.1, speed: 0.9, phase: 2.4, swayX: 0.8, swayZ: 0.5 })
    return m
  }, [])

  // 给下摆/长发/飘带的材质注入风（袖子用 group 旋转摆动，不走顶点风）
  useMemo(() => {
    applyWind(mRobe, { axis: 'y-', pivot: 0.55, amount: 0.14, speed: 1.1, phase: 0.0, swayX: 1.0, swayZ: 0.5 })
    applyWind(mSash, { axis: 'y-', pivot: 0.5, amount: 0.22, speed: 1.4, phase: 1.2, swayX: 1.2, swayZ: 0.7 })
    applyWind(mHair, { axis: 'y-', pivot: 1.55, amount: 0.1, speed: 0.9, phase: 2.4, swayX: 0.8, swayZ: 0.5 })
  }, [mRobe, mSash, mHair])

  // 长袍下摆几何：用 LatheGeometry 旋转出真实汉服剪影
  // 轮廓点（从上到下）：肩→胸→腰（收窄）→胯→下摆（大幅张开，拖地感）
  const robeGeom = useMemo(() => {
    const profile = [
      new THREE.Vector2(0.001, 0.0), // 中轴线起点（肩高）
      new THREE.Vector2(0.30, -0.05), // 颈口
      new THREE.Vector2(0.36, -0.18), // 胸
      new THREE.Vector2(0.30, -0.40), // 收腰（仙侠束腰）
      new THREE.Vector2(0.38, -0.58), // 胯
      new THREE.Vector2(0.52, -0.78), // 下摆外扩
      new THREE.Vector2(0.68, -0.92), // 下摆大幅张开（拖地）
      new THREE.Vector2(0.78, -1.02), // 落地
    ]
    const g = new THREE.LatheGeometry(profile, 40)
    return g
  }, [])
  // 广袖几何：横向锥筒，从肩(细)向袖口(宽)沿 X 轴伸出并下垂
  const sleeveGeom = useMemo(() => {
    // 横向 cylinder：topRadius=袖口宽, bottomRadius=肩接，旋转使轴沿 X
    const g = new THREE.CylinderGeometry(0.42, 0.14, 1.0, 14, 8, true)
    g.rotateZ(Math.PI / 2) // 轴从 Y 转到 X
    g.translate(-0.5, -0.15, 0) // 从原点向 -X 伸出并略下垂
    return g
  }, [])
  const hairGeom = useMemo(() => {
    // 背后长发：用 Lathe 做自然收束的发束
    const profile = [
      new THREE.Vector2(0.001, 0.0),
      new THREE.Vector2(0.09, -0.08),
      new THREE.Vector2(0.12, -0.3),
      new THREE.Vector2(0.10, -0.6), // 中段收
      new THREE.Vector2(0.06, -0.9), // 发梢
    ]
    const g = new THREE.LatheGeometry(profile, 20)
    return g
  }, [])
  const sashGeom = useMemo(() => {
    // 飘带：细长扁片
    const g = new THREE.BoxGeometry(0.08, 1.0, 0.03, 1, 8, 1)
    g.translate(0, -0.5, 0)
    return g
  }, [])

  useFrame((state, delta) => {
    const g = root.current
    if (!g) return
    const [x, , z] = posRef.current
    // y 跟随地形高度（解决穿地问题；脚本侧 y 不再使用）
    const groundY = getTerrainHeight(x, z)
    // 平滑跟随目标位置，避免镜头跳变时角色瞬移
    g.position.lerp(tmpVec.set(x, groundY, z), 0.2)
    // 朝向平滑
    const targetY = facingRef.current
    let dy = targetY - g.rotation.y
    while (dy > Math.PI) dy -= Math.PI * 2
    while (dy < -Math.PI) dy += Math.PI * 2
    g.rotation.y += dy * 0.18

    tRef.current += delta
    const t = tRef.current
    const action = actionRef.current

    // 推进风着色器时间
    tickWindMaterials(g, state.clock.elapsedTime)

    // ── 计算目标姿态（每个 action 产出一组目标关节角度） ──
    const WALK_FREQ = 2.8 // 行走频率（原 7 太快像小跑）
    const ROW_FREQ = 3.2
    let tgt = {
      bodyY: 0, bodyRotZ: 0, bodyRotX: 0,
      neckRotX: 0,
      leftArmX: 0.15, rightArmX: 0.15,
    }

    if (action === 'walk' || action === 'enter') {
      const ph = Math.sin(t * WALK_FREQ)
      const phAbs = Math.abs(ph)
      tgt.bodyY = phAbs * 0.06 // 步频上下浮动
      tgt.bodyRotZ = ph * 0.04 // 骨盆左右重心转移
      tgt.bodyRotX = 0.06 - phAbs * 0.03 // 上半身轻微前倾 + 胸腔反向补偿
      tgt.neckRotX = 0.03 + Math.sin(t * WALK_FREQ + 0.5) * 0.02 // 头微点
      tgt.leftArmX = ph * 0.5 + 0.2 // 双臂对侧摆
      tgt.rightArmX = -ph * 0.5 + 0.2
      // 脚步声：sin 过零点（脚落地）
      const sign = ph >= 0 ? 1 : -1
      if (onStep && sign !== lastStepSign.current) {
        lastStepSign.current = sign
        onStep()
      }
    } else if (action === 'row') {
      const ph = Math.sin(t * ROW_FREQ)
      tgt.bodyY = Math.abs(ph) * 0.04
      tgt.bodyRotX = -ph * 0.08 // 划船身体前倾后仰
      tgt.leftArmX = ph * 1.0 - 0.5 // 对侧交替（原为同向，失真）
      tgt.rightArmX = -ph * 1.0 - 0.5
      tgt.neckRotX = -ph * 0.04
    } else if (action === 'sit') {
      tgt.bodyY = -0.35 // 落座（blend 会缓动过渡，不再瞬降）
      tgt.bodyRotX = 0.12
      tgt.leftArmX = -1.0 // 双手置前（作揖/扶膝）
      tgt.rightArmX = -1.0
      tgt.neckRotX = 0.08
    } else {
      // idle：分层呼吸（身体起伏 + 头微点，不同相位）
      tgt.bodyY = Math.sin(t * 1.5) * 0.02
      tgt.bodyRotZ = Math.sin(t * 0.8) * 0.015
      tgt.bodyRotX = Math.sin(t * 1.5 + 0.3) * 0.025 // 胸腔呼吸（并入身体层）
      tgt.neckRotX = Math.sin(t * 0.9 + 1.2) * 0.02 // 头部慢点（独立相位）
      tgt.leftArmX = 0.15 + Math.sin(t * 0.8) * 0.04
      tgt.rightArmX = 0.15 - Math.sin(t * 0.8) * 0.04
    }

    // ── blend：每帧把当前姿态 lerp 到目标，消除 action 切换硬切 ──
    const b = blended.current
    const k = 0.12 // 阻尼系数
    b.bodyY = lerpScalar(b.bodyY, tgt.bodyY, k)
    b.bodyRotZ = lerpScalar(b.bodyRotZ, tgt.bodyRotZ, k)
    b.bodyRotX = lerpScalar(b.bodyRotX, tgt.bodyRotX, k)
    b.neckRotX = lerpScalar(b.neckRotX, tgt.neckRotX, k)
    b.leftArmX = lerpScalar(b.leftArmX, tgt.leftArmX, k)
    b.rightArmX = lerpScalar(b.rightArmX, tgt.rightArmX, k)

    if (body.current) {
      body.current.position.y = b.bodyY
      body.current.rotation.z = b.bodyRotZ
      body.current.rotation.x = b.bodyRotX
    }
    if (neck.current) neck.current.rotation.x = b.neckRotX
    if (leftSleeve.current) leftSleeve.current.rotation.x = b.leftArmX
    if (rightSleeve.current) rightSleeve.current.rotation.x = b.rightArmX
  })

  // 整体放大（程序化角色原生约 1.7 单位高，放大到 ~2.0 让镜头里更清晰）
  const SCALE = 1.2
  return (
    <group ref={root} position={[0, 0, 0]} scale={SCALE}>
      <group ref={body}>
        {/* ===== 长袍下摆（本体+描边都带风，成对） ===== */}
        <group ref={robeGroup} position={[0, 0.55, 0]}>
          <mesh material={mRobe} geometry={robeGeom} castShadow />
          <mesh material={mRobeOutline} geometry={robeGeom} />
        </group>

        {/* ===== 交领内衬（V 字领） ===== */}
        <Part geom={<coneGeometry args={[0.34, 0.55, 10]} />} mat={mInner} position={[0, 1.05, 0]} outline={1.06} />
        {/* 交领叠片 */}
        <Part geom={<boxGeometry args={[0.5, 0.18, 0.06]} />} mat={mRobe} position={[0.06, 1.18, 0.28]} rotation={[0.3, 0, -0.5]} outline={1.1} />

        {/* ===== 腰带 ===== */}
        <mesh position={[0, 0.78, 0]} material={mBelt} castShadow>
          <cylinderGeometry args={[0.45, 0.45, 0.16, 16]} />
        </mesh>
        <mesh scale={[1.06, 1, 1.06]} position={[0, 0.78, 0]}>
          <cylinderGeometry args={[0.45, 0.45, 0.16, 16]} />
          <meshBasicMaterial color="#2a1a10" side={THREE.BackSide} />
        </mesh>

        {/* ===== 飘带（左右，本体+描边都带风） ===== */}
        <mesh ref={sashL} position={[-0.22, 0.7, -0.18]} rotation={[0, 0.2, 0.04]} material={mSash} geometry={sashGeom} castShadow />
        <mesh position={[-0.22, 0.7, -0.18]} rotation={[0, 0.2, 0.04]} material={mSashOutline} geometry={sashGeom} />
        <mesh ref={sashR} position={[0.22, 0.7, -0.18]} rotation={[0, -0.2, -0.04]} material={mSash} geometry={sashGeom} castShadow />
        <mesh position={[0.22, 0.7, -0.18]} rotation={[0, -0.2, -0.04]} material={mSashOutline} geometry={sashGeom} />

        {/* 玉佩（挂腰带） */}
        <mesh position={[0.18, 0.62, 0.32]} material={mJade}>
          <boxGeometry args={[0.08, 0.12, 0.03]} />
        </mesh>

        {/* ===== 颈→头部分层（头部可独立微点，分层呼吸） ===== */}
        <group ref={neck} position={[0, 1.5, 0]}>
          {/* 头 */}
          <Part geom={<sphereGeometry args={[0.27, 28, 24]} />} mat={mSkin} position={[0, 0.12, 0]} outline={1.06} />

          {/* ===== 面部五官（角色面向 -z，故五官在 z 负侧） ===== */}
          {/* 眉（细长，略上扬的国风剑眉） */}
          <mesh position={[-0.08, 0.22, -0.22]} rotation={[0, 0, -0.15]}>
            <boxGeometry args={[0.1, 0.015, 0.02]} />
            <meshStandardMaterial color={mHair.color} roughness={0.7} />
          </mesh>
          <mesh position={[0.08, 0.22, -0.22]} rotation={[0, 0, 0.15]}>
            <boxGeometry args={[0.1, 0.015, 0.02]} />
            <meshStandardMaterial color={mHair.color} roughness={0.7} />
          </mesh>
          {/* 眼（眯眼线条，国风写意，不画眼白） */}
          <mesh position={[-0.08, 0.14, -0.235]} rotation={[0, 0, 0.1]}>
            <boxGeometry args={[0.08, 0.012, 0.015]} />
            <meshStandardMaterial color={'#1a1612'} roughness={0.5} />
          </mesh>
          <mesh position={[0.08, 0.14, -0.235]} rotation={[0, 0, -0.1]}>
            <boxGeometry args={[0.08, 0.012, 0.015]} />
            <meshStandardMaterial color={'#1a1612'} roughness={0.5} />
          </mesh>
          {/* 鼻（小三角锥，侧面才明显） */}
          <mesh position={[0, 0.1, -0.25]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.025, 0.06, 6]} />
            <meshStandardMaterial color={'#e8c4a0'} roughness={0.65} />
          </mesh>
          {/* 嘴（微抿，淡红） */}
          <mesh position={[0, 0.02, -0.245]}>
            <boxGeometry args={[0.06, 0.012, 0.015]} />
            <meshStandardMaterial color={'#a85a4a'} roughness={0.6} />
          </mesh>

          {/* 背后长发（本体+描边都带风） */}
          <mesh ref={hairBack} position={[0, 0.08, -0.18]} material={mHair} geometry={hairGeom} castShadow />
          <mesh position={[0, 0.08, -0.18]} material={mHairOutline} geometry={hairGeom} />
          {/* 头顶发 */}
          <Part geom={<sphereGeometry args={[0.27, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />} mat={mHair} position={[0, 0.14, 0]} outline={1.07} />

          {/* 束发冠 */}
          <mesh position={[0, 0.36, 0]} material={mCrown}>
            <cylinderGeometry args={[0.16, 0.18, 0.14, 14]} />
          </mesh>
          <mesh position={[0, 0.45, 0]} material={mCrown}>
            <sphereGeometry args={[0.05, 10, 10]} />
          </mesh>
        </group>

        {/* ===== 广袖（左右，本体+描边都带风） ===== */}
        <group ref={leftSleeve} position={[-0.34, 1.22, 0]}>
          <mesh material={mSleeve} geometry={sleeveGeom} castShadow />
          <mesh material={mSleeveOutline} geometry={sleeveGeom} />
          {/* 袖口内衬 */}
          <mesh geometry={sleeveGeom} scale={[0.5, 0.96, 0.5]} material={mInner} />
        </group>
        <group ref={rightSleeve} position={[0.34, 1.22, 0]} scale={[-1, 1, 1]}>
          <mesh material={mSleeve} geometry={sleeveGeom} castShadow />
          <mesh material={mSleeveOutline} geometry={sleeveGeom} />
          <mesh geometry={sleeveGeom} scale={[0.5, 0.96, 0.5]} material={mInner} />
        </group>

        {/* 手 */}
        <Part geom={<sphereGeometry args={[0.085, 10, 10]} />} mat={mSkin} position={[-0.34, 0.68, 0]} />
        <Part geom={<sphereGeometry args={[0.085, 10, 10]} />} mat={mSkin} position={[0.34, 0.68, 0]} />

        {/* 靴（袍下露出） */}
        <Part geom={<boxGeometry args={[0.16, 0.22, 0.3]} />} mat={mBoot} position={[-0.14, 0.11, 0.04]} outline={1.08} />
        <Part geom={<boxGeometry args={[0.16, 0.22, 0.3]} />} mat={mBoot} position={[0.14, 0.11, 0.04]} outline={1.08} />
      </group>
    </group>
  )
}

const tmpVec = new THREE.Vector3()

// ───────── Actor 分发 ─────────
// 默认用程序化角色（专为桃花源记定制的仙侠青衫文人：五官/广袖/束发冠/飘带/玉佩）。
// 所有尝试过的 GLB 模型都不合格：
//   - Xbot：黄色秃头现代运动角色，时代错误
//   - meshy "渔人"：实际是机械蛙形生物（黄色护目镜+机械结构），完全不可用
//   - soldier/readyplayer：现代人/士兵，与古风不符
// 程序化角色反而最贴合主题且无渲染隐患。
// 调试：?glb=<name> 可强制指定 GLB 模型（如 ?glb=soldier）。
const GLB_NAME = (() => {
  if (typeof window === 'undefined') return null
  const q = new URLSearchParams(window.location.search).get('glb')
  return q || null
})()

interface BoundaryProps {
  fallback: ReactNode
  children: ReactNode
}
interface BoundaryState {
  hasError: boolean
}
class ActorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(err: unknown) {
    console.warn('[Actor] GLB 加载失败，回退程序化角色:', err)
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}

import { ActorGLB } from './ActorGLB'
// 对外组件：默认程序化角色；?glb=<name> 时走 GLB（ErrorBoundary 兜底）
export function Actor(props: ActorProps) {
  if (!GLB_NAME) return <ActorProcedural {...props} />
  return (
    <ActorBoundary fallback={<ActorProcedural {...props} />}>
      <ActorGLB {...props} glbName={GLB_NAME} />
    </ActorBoundary>
  )
}

