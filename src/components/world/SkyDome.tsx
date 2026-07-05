import * as THREE from 'three/webgpu'
import { uniform, normalize, max, mix, Fn, vec3, positionWorld, color } from 'three/tsl'

// Gradient sky dome — TSL port of the original GLSL shader.
// Fragment: blend between top and bottom colors based on the normalized
// world-position Y. Runs on meshBasicNodeMaterial with a custom colorNode.
const skyGradient = Fn(([topColor, bottomColor]) => {
  const h = normalize(positionWorld).y
  return vec3(mix(bottomColor, topColor, max(h, 0)))
})

export function SkyDome() {
  const topColor = uniform(color(0xf5f0e0))
  const bottomColor = uniform(color(0xe8dcc8))

  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[200, 32, 32]} />
      <meshBasicNodeMaterial
        side={THREE.BackSide}
        depthWrite={false}
        colorNode={skyGradient(topColor, bottomColor)}
      />
    </mesh>
  )
}

export function GodRay({ position, target }: { position: [number, number, number]; target: [number, number, number] }) {
  return (
    <mesh>
      <coneGeometry args={[2.5, 15, 8, 1, true]} />
      <meshBasicMaterial
        color={0xffe8c0}
        transparent
        opacity={0.04}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}
