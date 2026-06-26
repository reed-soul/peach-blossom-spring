import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { createNoise2D } from 'simplex-noise'

const noise2D = createNoise2D()

export function Terrain() {
  const meshRef = useRef<THREE.Mesh>(null)

  const { geometry, streamPoints } = useMemo(() => {
    const size = 120
    const segments = 200
    const geo = new THREE.PlaneGeometry(size, size, segments, segments)
    geo.rotateX(-Math.PI / 2)

    const positions = geo.attributes.position
    const streamPath: THREE.Vector3[] = []

    // Stream path: meandering along z-axis
    const streamSteps = 60
    for (let i = 0; i < streamSteps; i++) {
      const t = i / streamSteps
      const x = Math.sin(t * Math.PI * 3) * 6 + Math.sin(t * Math.PI * 7) * 2
      const z = -size / 2 + t * size
      streamPath.push(new THREE.Vector3(x, 0, z))
    }

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const z = positions.getZ(i)

      // Multi-octave noise for natural terrain
      let height = 0
      height += noise2D(x * 0.02, z * 0.02) * 6       // Large hills
      height += noise2D(x * 0.05, z * 0.05) * 2        // Medium bumps
      height += noise2D(x * 0.1, z * 0.1) * 0.5        // Small detail

      // Flatten along stream path
      let minDistToStream = Infinity
      for (const sp of streamPath) {
        const dx = x - sp.x
        const dz = z - sp.z
        const dist = Math.sqrt(dx * dx + dz * dz)
        minDistToStream = Math.min(minDistToStream, dist)
      }

      // Carve stream channel
      if (minDistToStream < 4) {
        const streamFactor = Math.max(0, 1 - minDistToStream / 4)
        height = THREE.MathUtils.lerp(height, -0.8, streamFactor * streamFactor)
        // Steepen banks
        if (minDistToStream < 2.5) {
          height = THREE.MathUtils.lerp(height, -0.6, (1 - minDistToStream / 2.5) * 0.8)
        }
      }

      // Gentle slope downward toward cave (z = -50)
      const caveInfluence = Math.max(0, 1 - Math.abs(z - (-50)) / 20) * 2
      height += caveInfluence

      positions.setY(i, height)
    }

    geo.computeVertexNormals()

    // Vertex colors based on height
    const colors = new Float32Array(positions.count * 3)
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i)
      const c = new THREE.Color()

      if (y < -0.5) {
        // Stream bed - sandy/muddy
        c.setHex(0x8B7355)
      } else if (y < 0) {
        // Stream bank - dark earth
        c.lerpColors(new THREE.Color(0x3e2723), new THREE.Color(0x4a7c59), (y + 0.5) / 0.5)
      } else if (y < 2) {
        // Low ground - lush grass
        c.setHex(0x4a7c59)
        // Add some variation
        const variation = noise2D(positions.getX(i) * 0.3, positions.getZ(i) * 0.3) * 0.1
        c.r = Math.max(0, Math.min(1, c.r + variation))
        c.g = Math.max(0, Math.min(1, c.g + variation))
      } else if (y < 4) {
        // Hills - darker green
        c.lerpColors(new THREE.Color(0x4a7c59), new THREE.Color(0x2d5a3d), (y - 2) / 2)
      } else {
        // High ground - rocky
        c.lerpColors(new THREE.Color(0x2d5a3d), new THREE.Color(0x6d6d6d), Math.min(1, (y - 4) / 3))
      }

      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    return { geometry: geo, streamPoints: streamPath }
  }, [])

  return (
    <mesh ref={meshRef} geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.9} />
    </mesh>
  )
}
