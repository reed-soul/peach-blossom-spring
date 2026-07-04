import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ─────────────────────────────────────────────────────────────
// 炊烟粒子：Points + 自定义 shader，缓慢上升 + 扩散变淡
// 模拟村落"烟火气"（阡陌交通，鸡犬相闻）
// ─────────────────────────────────────────────────────────────

export interface SmokeProps {
  /** 烟源位置（通常是烟囱顶） */
  position: [number, number, number]
  /** 粒子数，默认 40 */
  count?: number
  /** 烟色，默认暖灰 #d8d0c0 */
  color?: string
  /** 上升速度系数，默认 1 */
  speed?: number
}

export function Smoke({ position, count = 40, color = '#d8d0c0', speed = 1 }: SmokeProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const matRef = useRef<THREE.ShaderMaterial>(null)

  // 每个粒子的随机参数（seed，确保确定性，避免每帧抖）
  const seeds = useMemo(() => {
    const arr: { phase: number; xDrift: number; zDrift: number; riseK: number; sizeK: number }[] = []
    for (let i = 0; i < count; i++) {
      arr.push({
        phase: Math.random() * Math.PI * 2,
        xDrift: (Math.random() - 0.5) * 0.6,
        zDrift: (Math.random() - 0.5) * 0.6,
        riseK: 0.5 + Math.random() * 0.5, // 上升速度差异
        sizeK: 0.6 + Math.random() * 0.6, // 大小差异
      })
    }
    return arr
  }, [count])

  // Points 几何：position attribute 在 shader 里按 uTime 计算
  const { geometry, sizeAttr } = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    // 初始位置全在烟源（shader 负责偏移）
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const phases = new Float32Array(count)
    const drifts = new Float32Array(count * 2)
    seeds.forEach((s, i) => {
      positions[i * 3] = 0
      positions[i * 3 + 1] = 0
      positions[i * 3 + 2] = 0
      sizes[i] = s.sizeK
      phases[i] = s.phase
      drifts[i * 2] = s.xDrift
      drifts[i * 2 + 1] = s.zDrift
    })
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
    geo.setAttribute('aDrift', new THREE.BufferAttribute(drifts, 2))
    return { geometry: geo, sizeAttr: sizes }
  }, [count, seeds])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSpeed: { value: speed },
      uColor: { value: new THREE.Color(color) },
    }),
    [speed, color],
  )

  useFrame((state) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = state.clock.elapsedTime
    }
  })

  // 烟雾 shader：粒子按 index 循环上升（每个粒子 offset = (i/count)*cycleTime）
  const vertexShader = `
    attribute float aSize;
    attribute float aPhase;
    attribute vec2 aDrift;
    uniform float uTime;
    uniform float uSpeed;
    varying float vAlpha;

    void main() {
      // 每个粒子的生命周期（用 index 伪随机错开）
      float cycle = 6.0; // 6 秒一个循环
      float t = mod(uTime * uSpeed + aPhase * 1.2, cycle) / cycle; // 0..1

      // 上升：y 随 t 上升（非线性，越升越慢模拟热气扩散减速）
      float y = t * 4.5 * (0.8 + aSize * 0.3);
      // 水平漂移：随高度增大
      float x = aDrift.x * t * 1.5 + sin(uTime * 0.5 + aPhase) * 0.3 * t;
      float z = aDrift.y * t * 1.5 + cos(uTime * 0.4 + aPhase) * 0.3 * t;

      vec3 pos = position + vec3(x, y, z);

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      // 大小随高度增大（烟扩散）
      float sz = (aSize * 0.6 + t * 1.2) * 60.0;
      gl_PointSize = sz / -mvPosition.z * 10.0;
      gl_Position = projectionMatrix * mvPosition;

      // alpha：开头淡入、结尾淡出（中间最浓）
      vAlpha = sin(t * 3.14159) * 0.5;
    }
  `
  const fragmentShader = `
    uniform vec3 uColor;
    varying float vAlpha;
    void main() {
      // 圆形点（软边缘）
      vec2 c = gl_PointCoord - vec2(0.5);
      float d = length(c);
      if (d > 0.5) discard;
      float soft = smoothstep(0.5, 0.1, d);
      gl_FragColor = vec4(uColor, soft * vAlpha * 0.6);
    }
  `

  return (
    <points ref={pointsRef} position={position} geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
      />
    </points>
  )
}

// ─────────────────────────────────────────────────────────────
// 烟囱：小 box（放在屋顶上）+ 炊烟
// ─────────────────────────────────────────────────────────────
export function ChimneyWithSmoke({
  position,
  scale = 1,
}: {
  position: [number, number, number]
  scale?: number
}) {
  // 烟囱顶部位置（烟源）
  const smokePos: [number, number, number] = [
    position[0],
    position[1] + 0.3 * scale,
    position[2],
  ]
  return (
    <group>
      {/* 烟囱本体（小砖柱） */}
      <mesh position={position} scale={scale} castShadow>
        <boxGeometry args={[0.4, 0.8, 0.4]} />
        <meshStandardMaterial color={0x6a5040} roughness={0.95} />
      </mesh>
      {/* 炊烟 */}
      <Smoke position={smokePos} count={35} speed={0.8} color="#d8d0c0" />
    </group>
  )
}
