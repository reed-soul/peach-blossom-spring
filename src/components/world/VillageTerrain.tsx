import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { createNoise2D } from 'simplex-noise'

const noise2D = createNoise2D()

/** Gentler terrain for the village — flat farmlands with a central pond depression */
export function VillageTerrain() {
  const meshRef = useRef<THREE.Mesh>(null)

  const geometry = useMemo(() => {
    const size = 100
    const segments = 120
    const geo = new THREE.PlaneGeometry(size, size, segments, segments)
    geo.rotateX(-Math.PI / 2)

    const positions = geo.attributes.position
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const z = positions.getZ(i)

      let height = noise2D(x * 0.03, z * 0.03) * 0.8
      height += noise2D(x * 0.08, z * 0.08) * 0.25

      // Central pond basin
      const pondDist = Math.sqrt(x * x + (z + 8) * (z + 8))
      if (pondDist < 8) {
        height = THREE.MathUtils.lerp(height, -0.4, Math.max(0, 1 - pondDist / 8))
      }

      // Gentle rise at edges
      const edge = Math.max(Math.abs(x), Math.abs(z)) / (size * 0.45)
      if (edge > 0.7) {
        height += (edge - 0.7) * 3
      }

      positions.setY(i, height)
    }

    geo.computeVertexNormals()

    const colors = new Float32Array(positions.count * 3)
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i)
      const c = new THREE.Color()
      if (y < -0.2) {
        c.setHex(0x6d8b7a)
      } else if (y < 0.5) {
        c.setHex(0x5a9a5a)
        const v = noise2D(positions.getX(i) * 0.2, positions.getZ(i) * 0.2) * 0.08
        c.g = Math.min(1, c.g + v)
      } else {
        c.lerpColors(new THREE.Color(0x5a9a5a), new THREE.Color(0x4a7c59), Math.min(1, (y - 0.5) / 2))
      }
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    return geo
  }, [])

  return (
    <mesh ref={meshRef} geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.92} />
    </mesh>
  )
}
