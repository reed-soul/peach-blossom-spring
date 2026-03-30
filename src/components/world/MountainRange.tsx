import { useMemo } from 'react'
import * as THREE from 'three'
import { createNoise2D } from 'simplex-noise'

const noise2D = createNoise2D()

export function MountainRange() {
  const mountains = useMemo(() => {
    const result: { position: [number, number, number]; scale: [number, number, number]; rotation: number; color: number }[] = []

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

      // Gradient from dark to light (far = lighter, atmospheric perspective)
      const brightness = 0.25 + Math.sin(i * 4.1) * 0.08

      result.push({
        position: [x, height * 0.3, z],
        scale: [width, height, depth],
        rotation: angle,
        color: new THREE.Color(brightness * 0.7, brightness * 0.75, brightness * 0.85).getHex(),
      })
    }

    return result
  }, [])

  return (
    <group>
      {mountains.map((m, i) => (
        <MountainMesh key={i} {...m} seed={i * 111} />
      ))}
    </group>
  )
}

function MountainMesh({ position, scale, rotation, color, seed }: {
  position: [number, number, number]
  scale: [number, number, number]
  rotation: number
  color: number
  seed: number
}) {
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55)
    const positions = geo.attributes.position
    const rng = mulberry32(seed)

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
    }

    geo.computeVertexNormals()
    return geo
  }, [seed])

  return (
    <mesh position={position} scale={scale} rotation={[0, rotation, 0]} geometry={geometry}>
      <meshStandardMaterial
        color={color}
        roughness={1}
        flatShading
        transparent
        opacity={0.7}
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
