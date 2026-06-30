import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ActorAction } from './types'
import { applyWind, tickWindMaterials } from './WindShader'

// ─────────────────────────────────────────────────────────────
// 仙侠风渔人：宽袍广袖 · 交领 · 长发 · 束发冠 · 飘带 · 玉佩
// 飘动用顶点着色器（onBeforeCompile），保持 toon 卡通渲染
// ─────────────────────────────────────────────────────────────

// 3 级明暗的 toon 渐变贴图
function useGradientMap() {
  return useMemo(() => {
    const data = new Uint8Array([90, 170, 245])
    const tex = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat)
    tex.needsUpdate = true
    tex.minFilter = THREE.NearestFilter
    tex.magFilter = THREE.NearestFilter
    return tex
  }, [])
}

// 创建一个带描边的 toon 材质（描边=背面法线外扩的黑色外壳）
function useToonMat(color: string, gradientMap: THREE.Texture) {
  return useMemo(() => {
    const mat = new THREE.MeshToonMaterial({ color, gradientMap })
    return mat
  }, [color, gradientMap])
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
      <meshBasicMaterial color="#15110c" side={THREE.BackSide} />
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

export function Actor({ posRef, facingRef, actionRef, onStep }: ActorProps) {
  const root = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const robeGroup = useRef<THREE.Group>(null)
  const leftSleeve = useRef<THREE.Group>(null)
  const rightSleeve = useRef<THREE.Group>(null)
  const hairBack = useRef<THREE.Mesh>(null)
  const sashL = useRef<THREE.Mesh>(null)
  const sashR = useRef<THREE.Mesh>(null)
  const tRef = useRef(0)
  const lastStepSign = useRef(1) // 脚步触发：检测 swing 正弦过零点

  const gradient = useGradientMap()

  // 配色（仙侠青衫文人）
  const mRobe = useToonMat('#3a6e7a', gradient) // 外袍青
  const mSleeve = useToonMat('#3a6e7a', gradient) // 广袖（同色但独立风参数）
  const mInner = useToonMat('#ede4d0', gradient) // 内衫米白
  const mBelt = useToonMat('#4a3220', gradient) // 腰带深褐
  const mSkin = useToonMat('#f2d2ac', gradient) // 肤色
  const mHair = useToonMat('#1a1612', gradient) // 发色
  const mCrown = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#c9a24a', metalness: 0.85, roughness: 0.25 }),
    [],
  )
  const mBoot = useToonMat('#241c16', gradient)
  const mJade = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#5fa88a', metalness: 0.3, roughness: 0.4 }),
    [],
  )
  const mSash = useToonMat('#7a3030', gradient) // 飘带暗红

  // 飘动部件的描边材质（黑色背面 + 同样的风参数，确保描边跟随本体飘动）
  const mRobeOutline = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({ color: '#15110c', side: THREE.BackSide })
    applyWind(m, { axis: 'y-', pivot: 0.55, amount: 0.14, speed: 1.1, phase: 0.0, swayX: 1.0, swayZ: 0.5 })
    return m
  }, [])
  const mSleeveOutline = useMemo(() => {
    // 袖子描边：无风（袖子靠 group 旋转摆动）
    return new THREE.MeshBasicMaterial({ color: '#15110c', side: THREE.BackSide })
  }, [])
  const mSashOutline = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({ color: '#15110c', side: THREE.BackSide })
    applyWind(m, { axis: 'y-', pivot: 0.5, amount: 0.22, speed: 1.4, phase: 1.2, swayX: 1.2, swayZ: 0.7 })
    return m
  }, [])
  const mHairOutline = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({ color: '#15110c', side: THREE.BackSide })
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
    const g = new THREE.LatheGeometry(profile, 24)
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
    const g = new THREE.LatheGeometry(profile, 10)
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
    const [x, y, z] = posRef.current
    // 平滑跟随目标位置，避免镜头跳变时角色瞬移
    g.position.lerp(tmpVec.set(x, y, z), 0.2)
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

    // 行走：整体上下浮动 + 四肢摆动
    if (action === 'walk' || action === 'enter') {
      const swing = Math.sin(t * 7) * 0.6
      if (body.current) {
        body.current.position.y = Math.abs(Math.sin(t * 7)) * 0.06
        body.current.rotation.z = Math.sin(t * 7) * 0.03
      }
      if (leftSleeve.current) leftSleeve.current.rotation.x = swing * 0.5 + 0.2
      if (rightSleeve.current) rightSleeve.current.rotation.x = -swing * 0.5 + 0.2
      // 脚步声：检测 sin(t*7) 过零点（脚落地时刻）
      const sign = Math.sin(t * 7) >= 0 ? 1 : -1
      if (onStep && sign !== lastStepSign.current) {
        lastStepSign.current = sign
        onStep()
      }
    } else if (action === 'row') {
      // 划船：双手前后交替大幅摆动
      const row = Math.sin(t * 3.2)
      if (leftSleeve.current) leftSleeve.current.rotation.x = row * 1.1 - 0.4
      if (rightSleeve.current) rightSleeve.current.rotation.x = row * 1.1 - 0.4
      if (body.current) body.current.position.y = Math.abs(Math.sin(t * 3.2)) * 0.04
    } else if (action === 'sit') {
      if (body.current) body.current.position.y = -0.35
      if (leftSleeve.current) leftSleeve.current.rotation.x = -1.2
      if (rightSleeve.current) rightSleeve.current.rotation.x = -1.2
    } else {
      // idle：呼吸 + 轻微摇摆（配合风）
      if (body.current) {
        body.current.position.y = Math.sin(t * 1.5) * 0.02
        body.current.rotation.z = Math.sin(t * 0.8) * 0.015
      }
      if (leftSleeve.current) leftSleeve.current.rotation.x = 0.15 + Math.sin(t * 0.8) * 0.04
      if (rightSleeve.current) rightSleeve.current.rotation.x = 0.15 - Math.sin(t * 0.8) * 0.04
    }
  })

  return (
    <group ref={root} position={[0, 0, 0]}>
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
          <meshBasicMaterial color="#15110c" side={THREE.BackSide} />
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

        {/* ===== 头 ===== */}
        <Part geom={<sphereGeometry args={[0.27, 18, 18]} />} mat={mSkin} position={[0, 1.62, 0]} outline={1.06} />

        {/* ===== 背后长发（本体+描边都带风） ===== */}
        <mesh ref={hairBack} position={[0, 1.58, -0.18]} material={mHair} geometry={hairGeom} castShadow />
        <mesh position={[0, 1.58, -0.18]} material={mHairOutline} geometry={hairGeom} />
        {/* 头顶发 */}
        <Part geom={<sphereGeometry args={[0.27, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />} mat={mHair} position={[0, 1.64, 0]} outline={1.07} />

        {/* ===== 束发冠 ===== */}
        <mesh position={[0, 1.86, 0]} material={mCrown}>
          <cylinderGeometry args={[0.16, 0.18, 0.14, 8]} />
        </mesh>
        <mesh position={[0, 1.95, 0]} material={mCrown}>
          <sphereGeometry args={[0.05, 10, 10]} />
        </mesh>

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
