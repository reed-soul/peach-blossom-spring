import { useMemo } from 'react'
import * as THREE from 'three'
import { createNoise2D } from 'simplex-noise'

const noise2D = createNoise2D()

export function MountainRange() {
  const mountains = useMemo(() => {
    const result: { position: [number, number, number]; scale: [number, number, number]; rotation: number; distance: number; seed: number }[] = []

    // Ring of mountains surrounding the scene
    const count = 14
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const r = 80 + Math.sin(i * 5.3) * 15
      const x = Math.cos(angle) * r
      const z = Math.sin(angle) * r
      const height = 25 + Math.sin(i * 3.7) * 12
      const width = 20 + Math.sin(i * 7.1) * 8
      const depth = 25 + Math.sin(i * 2.3) * 10

      result.push({
        position: [x, height * 0.3, z],
        scale: [width, height, depth],
        rotation: angle,
        distance: r, // 距离场景中心的距离，用于驱动颜色（空气透视）
        seed: i * 111,
      })
    }

    return result
  }, [])

  return (
    <group>
      {mountains.map((m, i) => (
        <MountainMesh key={i} {...m} />
      ))}
    </group>
  )
}

function MountainMesh({ position, scale, rotation, distance, seed }: {
  position: [number, number, number]
  scale: [number, number, number]
  rotation: number
  distance: number
  seed: number
}) {
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55)
    const positions = geo.attributes.position

    // 顶点色数组：山脚绿、山顶灰岩（按归一化高度 lerp）
    const colorArr = new Float32Array(positions.count * 3)
    const cFoot = new THREE.Color(0x4a5a3a) // 山脚深绿
    const cMid = new THREE.Color(0x6a6258)  // 中段褐灰
    const cPeak = new THREE.Color(0x8a8a92) // 山顶浅灰（岩石/雾）

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const y = positions.getY(i)
      const z = positions.getZ(i)

      // Noise displacement for natural mountain shape
      const n = noise2D(x * 2 + seed, z * 2 + seed) * 0.3
      const n2 = noise2D(x * 4 + seed, z * 4 + seed) * 0.1

      // Make peaks more jagged at top
      const peakFactor = Math.max(0, y) * 0.3

      positions.setX(i, x * (1 + n + peakFactor * 0.2))
      positions.setY(i, y * (1 + n2 + peakFactor * 0.3))
      positions.setZ(i, z * (1 + n + peakFactor * 0.15))

      // 顶点色：按归一化 y 高度分三档
      const ny = (y + 1) * 0.5 // 归一化到 0..1（sphere 局部 y ∈ [-1,1]）
      const c = new THREE.Color()
      if (ny < 0.4) {
        c.lerpColors(cFoot, cMid, ny / 0.4)
      } else {
        c.lerpColors(cMid, cPeak, (ny - 0.4) / 0.6)
      }
      colorArr[i * 3] = c.r
      colorArr[i * 3 + 1] = c.g
      colorArr[i * 3 + 2] = c.b
    }

    geo.computeVertexNormals()
    // 顶点色直接挂到 geometry 上（vertexColors 需要 'color' attribute）
    geo.setAttribute('color', new THREE.BufferAttribute(colorArr, 3))
    return geo
  }, [seed])

  // 距离驱动的基础色（远山偏淡蓝灰，近山偏深）：归一化距离 0.65..1.0 → 亮度 1.0..0.7
  const distFactor = THREE.MathUtils.clamp((distance - 65) / 35, 0, 1) // 0=近, 1=远

  return (
    <mesh position={position} scale={scale} rotation={[0, rotation, 0]} geometry={geometry}>
      <meshStandardMaterial
        vertexColors
        color={new THREE.Color().setHSL(0.6, 0.1, 1 - distFactor * 0.3)}
        roughness={0.95}
        // 去掉 flatShading + transparent：改用顶点色 + 雾实现空气透视
        // 远山靠 scene.fog 自然淡出，不再半透明穿透
      />
    </mesh>
  )
}

function mulberry32(a: number) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
