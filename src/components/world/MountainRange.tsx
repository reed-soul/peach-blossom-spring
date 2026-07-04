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
    // 用 IcosahedronGeometry(detail=3) 替代 SphereGeometry：顶点分布更不规则，
    // 配合法线方向位移 + 幂锐化，能出尖锐山脊而非圆润球面
    const geo = new THREE.IcosahedronGeometry(1, 3)
    const positions = geo.attributes.position

    // 顶点色数组：山脚绿、山顶灰岩（按归一化高度 lerp）
    const colorArr = new Float32Array(positions.count * 3)
    const cFoot = new THREE.Color(0x4a5a3a) // 山脚深绿
    const cMid = new THREE.Color(0x6a6258)  // 中段褐灰
    const cPeak = new THREE.Color(0x8a8a92) // 山顶浅灰（岩石/雾）

    const tmpV = new THREE.Vector3()
    const tmpN = new THREE.Vector3()

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const y = positions.getY(i)
      const z = positions.getZ(i)
      tmpV.set(x, y, z)
      // 法线方向（IcosahedronGeometry 法线 = 归一化位置）
      tmpN.copy(tmpV).normalize()

      // 归一化高度（0=底部, 1=山顶）：只取上半部分当山
      const heightNorm = Math.max(0, (y + 0.5) / 1.5)

      // 多层噪声（低频大山形 + 中频脊线 + 高频碎石）
      const n1 = noise2D(x * 1.5 + seed, z * 1.5 + seed)
      const n2 = noise2D(x * 4.0 + seed * 2, z * 4.0 + seed * 2)
      const n3 = noise2D(x * 9.0 + seed * 3, z * 9.0 + seed * 3)

      // 沿法线位移：底部少推（保持山脚宽），顶部多推（出尖峰）
      // 幂锐化：pow(heightNorm, 2.5) 让顶部急剧收窄
      const ridge = Math.pow(heightNorm, 2.5)
      const displacement = (n1 * 0.4 + n2 * 0.2 + n3 * 0.08) * (0.3 + ridge * 1.2)

      // 沿法线推（不再用径向缩放，才能出脊线）
      tmpV.addScaledVector(tmpN, displacement)
      // 顶部额外拔高（尖锐峰）
      if (heightNorm > 0.6) {
        tmpV.y += (heightNorm - 0.6) * 0.8 * (0.5 + n1 * 0.5)
      }

      positions.setXYZ(i, tmpV.x, tmpV.y, tmpV.z)

      // 顶点色：按归一化 y 高度分三档
      const ny = (tmpV.y + 1) * 0.5
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
