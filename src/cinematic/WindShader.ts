import * as THREE from 'three/webgpu'
import { uniform, time, sin, fract, smoothstep, Fn, positionLocal, vec3 } from 'three/tsl'

/**
 * 给一个 NodeMaterial 注入顶点级"风/飘动"动画 (TSL positionNode)。
 *
 * 这是原 WebGL 版 (onBeforeCompile + GLSL) 的 WebGPU/TSL 移植。逻辑保留:
 * - 越靠近"末端" (沿 Y 轴某高度以上/以下, 由参数控制) 位移越大
 * - 用正弦+简易噪声做柔和飘动
 * - 末端微微下垂 (重力感)
 *
 * axis: 'y+' 末端在上方 (头发上→下飘); 'y-' 末端在下方 (下摆、飘带)
 * pivot: 位移基准点 (约束在该处不动)
 * amount: 末端最大位移量
 * speed: 飘动速度
 * phase: 相位偏移
 */
export interface WindParams {
  axis: 'y+' | 'y-'
  pivot: number
  amount: number
  speed?: number
  phase?: number
  swayX?: number
  swayZ?: number
}

// 简易 1D hash 噪声 (TSL Fn 等价于原 GLSL hash11).
const hash11 = Fn(([p]) => {
  const x = fract(p.mul(0.1031))
  const y = x.mul(x.add(33.33))
  return fract(y.mul(y.add(y)))
})

export function applyWind<T extends THREE.Material>(material: T, p: WindParams): T {
  const speed = p.speed ?? 1.2
  const phase = p.phase ?? 0
  const swayX = p.swayX ?? 1.0
  const swayZ = p.swayZ ?? 0.4
  const dir = p.axis === 'y+' ? 1 : -1

  const uTime = uniform(0)
  const uPivot = uniform(p.pivot)
  const uAmount = uniform(p.amount)
  const uSpeed = uniform(speed)
  const uPhase = uniform(phase)
  const uSwayX = uniform(swayX)
  const uSwayZ = uniform(swayZ)
  const uDir = uniform(dir)

  // positionNode: 在原 local position 基础上叠加风位移。
  const displacement = Fn(() => {
    const py = positionLocal.y
    const dist = py.sub(uPivot).mul(uDir) // 末端为正
    const w = smoothstep(0, 1, dist) // 末端权重 0→1
    const t = uTime.mul(uSpeed).add(uPhase)
    const n = hash11(py.mul(4).add(t.mul(0.5)).floor())
    const sway = sin(t.add(py.mul(1.5))).mul(0.5).add(0.5)
    const wob = sin(t.mul(1.7).add(n.mul(6.28))).mul(0.5)
    const amp = sway.mul(0.7).add(wob.mul(0.3)).mul(w).mul(uAmount)
    const dx = amp.mul(uSwayX)
    const dz = amp.mul(uSwayZ).mul(sin(t.mul(0.8)))
    const dy = w.mul(uAmount).mul(-0.15) // 末端下垂
    return vec3(dx, dy, dz)
  })()

  ;(material as any).positionNode = positionLocal.add(displacement)

  // 缓存 uniforms 引用, tickWindMaterials 推进 uTime.
  ;(material as any).userData.windApplied = true
  ;(material as any).userData.windUniforms = { uTime }
  return material
}

/** 在 useFrame 中推进所有带风材质的 uTime */
export function tickWindMaterials(root: THREE.Object3D, elapsed: number) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    const mat = mesh.material as THREE.Material | undefined
    if (mat && (mat as any).userData?.windApplied) {
      const shared = (mat as any).userData.windUniforms
      if (shared?.uTime) shared.uTime.value = elapsed
    }
  })
}
