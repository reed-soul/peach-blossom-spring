import { useMemo } from 'react'
import * as THREE from 'three'
import { createNoise2D } from 'simplex-noise'

const noise2D = createNoise2D()

export function Terrain() {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(200, 200, 128, 128)
    geo.rotateX(-Math.PI / 2)

    const positions = geo.attributes.position
    const colors = new Float32Array(positions.count * 3)

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const z = positions.getZ(i)
      const y = noise2D(x * 0.02, z * 0.02) * 3 + noise2D(x * 0.05, z * 0.05) * 1.5
      positions.setY(i, y)

      // Vertex color variation: green grass tones
      const g = 0.35 + noise2D(x * 0.1, z * 0.1) * 0.15
      colors[i * 3] = 0.18 + noise2D(x * 0.08, z * 0.08) * 0.05 // R
      colors[i * 3 + 1] = g // G
      colors[i * 3 + 2] = 0.15 // B
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    return geo
  }, [])

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.95} />
    </mesh>
  )
}
