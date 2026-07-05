import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three/webgpu'
import { uniform, time, sin, cos, mod, float, vec3, vec2, attribute, Fn, length, smoothstep, fract, sub, add, mul } from 'three/tsl'

// ──────────────────────────────────────────────
// 炊烟粒子：Points + TSL NodeMaterial
// WebGPU 不支持 gl_PointSize/gl_PointCoord, 但 three.js r171+ 的 Points
// 在 WebGPURenderer 下自动用 instanced quad 渲染, TSL 提供 particleUV 等.
// 这里用 pointsNodeMaterial + TSL 节点重写原 GLSL 的上升/扩散/淡入淡出.
// ──────────────────────────────────────────────

export interface SmokeProps {
  position: [number, number, number]
  count?: number
  color?: string
  speed?: number
}

// 上升 + 漂移位置（vertex/positionNode）. t = 粒子生命周期 0..1.
const smokePosition = Fn(([uTime, uSpeed]) => {
  const aSize = attribute('aSize', 'float')
  const aPhase = attribute('aPhase', 'float')
  const aDrift = attribute('aDrift', 'vec2')

  const cycle = float(6.0)
  const t = mod(uTime.mul(uSpeed).add(aPhase.mul(1.2)), cycle).div(cycle)

  // 上升 + 水平漂移（随高度增大）。
  const y = t.mul(4.5).mul(float(0.8).add(aSize.mul(0.3)))
  const x = aDrift.x.mul(t).mul(1.5).add(sin(uTime.mul(0.5).add(aPhase)).mul(0.3).mul(t))
  const z = aDrift.y.mul(t).mul(1.5).add(cos(uTime.mul(0.4).add(aPhase)).mul(0.3).mul(t))

  return vec3(x, y, z)
})

// 软圆点 alpha（fragment）. coord 是粒子 uv (0..1).
const smokeAlpha = Fn(([uTime, uSpeed]) => {
  const aPhase = attribute('aPhase', 'float')
  const cycle = float(6.0)
  const t = mod(uTime.mul(uSpeed).add(aPhase.mul(1.2)), cycle).div(cycle)
  // 中间最浓(sin(pi·t)·0.5)
  return sin(t.mul(Math.PI)).mul(0.5)
})

export function Smoke({ position, count = 40, color = '#d8d0c0', speed = 1 }: SmokeProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const uTime = uniform(0)
  const uSpeed = uniform(speed)
  const uColor = uniform(new THREE.Color(color))

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const phases = new Float32Array(count)
    const drifts = new Float32Array(count * 2)
    for (let i = 0; i < count; i++) {
      const phase = Math.random() * Math.PI * 2
      const xDrift = (Math.random() - 0.5) * 0.6
      const zDrift = (Math.random() - 0.5) * 0.6
      const sizeK = 0.6 + Math.random() * 0.6
      sizes[i] = sizeK
      phases[i] = phase
      drifts[i * 2] = xDrift
      drifts[i * 2 + 1] = zDrift
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
    geo.setAttribute('aDrift', new THREE.BufferAttribute(drifts, 2))
    return geo
  }, [count])

  useFrame((state) => {
    uTime.value = state.clock.elapsedTime
  })

  return (
    <points ref={pointsRef} position={position} geometry={geometry}>
      <pointsNodeMaterial transparent depthWrite={false} colorNode={uColor} positionNode={smokePosition(uTime, uSpeed)} alphaNode={smokeAlpha(uTime, uSpeed)} />
    </points>
  )
}

// ──────────────────────────────────────────────
// 烟囱：小 box（放在屋顶上）+ 炊烟
// ──────────────────────────────────────────────
export function ChimneyWithSmoke({
  position,
  scale = 1,
}: {
  position: [number, number, number]
  scale?: number
}) {
  const smokePos: [number, number, number] = [
    position[0],
    position[1] + 0.3 * scale,
    position[2],
  ]
  return (
    <group>
      <mesh position={position} scale={scale} castShadow>
        <boxGeometry args={[0.4, 0.8, 0.4]} />
        <meshStandardMaterial color={0x6a5040} roughness={0.95} />
      </mesh>
      <Smoke position={smokePos} count={35} speed={0.8} color="#d8d0c0" />
    </group>
  )
}
