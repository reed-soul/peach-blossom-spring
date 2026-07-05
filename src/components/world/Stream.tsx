import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three/webgpu'
import { createNoise2D } from 'simplex-noise'
import { PbrTextures } from '../../cinematic/textures/PbrTextures'
import {
  uniform,
  time,
  Fn,
  vec2,
  vec3,
  vec4,
  sin,
  cos,
  fract,
  floor,
  dot,
  float,
  mix,
  pow,
  max,
  min,
  smoothstep,
  normalize,
  texture,
  positionLocal,
  uv,
  cameraPosition,
  modelWorldMatrix,
  sub,
} from 'three/tsl'

const noise2D = createNoise2D()

// Hash + value noise TSL helpers (port of the GLSL originals).
const hash = Fn(([p]) => fract(sin(dot(p, vec2(127.1, 311.7))).mul(43758.5453)))
const valueNoise = Fn(([p]) => {
  const i = floor(p)
  const f = fract(p)
  const ff = f.mul(f).mul(sub(3, f.mul(2)))
  const a = hash(i)
  const b = hash(i.add(vec2(1, 0)))
  const c = hash(i.add(vec2(0, 1)))
  const d = hash(i.add(vec2(1, 1)))
  return mix(mix(a, b, ff.x), mix(c, d, ff.x), ff.y)
})

export function Stream() {
  const meshRef = useRef<THREE.Mesh>(null)

  const { geometry, flowUvs } = useMemo(() => {
    // Generate stream path points
    const pathPoints: THREE.Vector3[] = []
    const steps = 80
    const size = 120
    for (let i = 0; i < steps; i++) {
      const t = i / steps
      const x = Math.sin(t * Math.PI * 3) * 6 + Math.sin(t * Math.PI * 7) * 2
      const z = -size / 2 + t * size
      pathPoints.push(new THREE.Vector3(x, 0, z))
    }

    const widthSegments = 8
    const verts: number[] = []
    const uvs: number[] = []
    const normals: number[] = []
    const indices: number[] = []
    const streamWidth = 2.5

    for (let i = 0; i < pathPoints.length; i++) {
      const p = pathPoints[i]!
      const prev = pathPoints[Math.max(0, i - 1)]!
      const next = pathPoints[Math.min(pathPoints.length - 1, i + 1)]!
      const tangent = new THREE.Vector3().subVectors(next, prev).normalize()
      const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize()

      for (let j = 0; j <= widthSegments; j++) {
        const tx = j / widthSegments - 0.5
        const px = p.x + side.x * tx * streamWidth
        const pz = p.z + side.z * tx * streamWidth
        verts.push(px, 0, pz)
        uvs.push(tx + 0.5, i / (pathPoints.length - 1))
        normals.push(0, 1, 0)
      }
    }
    for (let i = 0; i < pathPoints.length - 1; i++) {
      for (let j = 0; j < widthSegments; j++) {
        const a = i * (widthSegments + 1) + j
        const b = a + 1
        const c = a + (widthSegments + 1)
        const d = c + 1
        indices.push(a, c, b, b, c, d)
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()

    return { geometry: geo, flowUvs: uvs }
  }, [])

  void flowUvs

  // ── TSL water material ──
  const uColor1 = uniform(new THREE.Color(0x4a8b8b))
  const uColor2 = uniform(new THREE.Color(0x2e6b6b))
  const uColor3 = uniform(new THREE.Color(0xffffff))
  const normalMap = useMemo(() => PbrTextures.waterNormal([4, 8]), [])
  const uNormalMap = uniform(normalMap)

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardNodeMaterial({
      transparent: true,
      roughness: 0.2,
      metalness: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false,
    })

    // Vertex: wave the y position (port of GLSL vertex shader).
    mat.positionNode = Fn(() => {
      const pos = positionLocal
      const wave = sin(pos.z.mul(1.5).add(time.mul(1.2))).mul(0.08)
        .add(sin(pos.x.mul(2.0).add(time.mul(0.9))).mul(0.05))
      return vec3(pos.x, pos.y.add(wave), pos.z)
    })()

    // Fragment: flowing normal-map water + Fresnel + sparkle + edge fade.
    mat.outputNode = Fn(() => {
      const vuv = uv()

      // Flow UV (scrolling).
      const flowUv = vec2(vuv.x, vuv.y.add(time.mul(0.08)))
      const nUv1 = flowUv.mul(3).add(vec2(0, time.mul(0.05)))
      const nUv2 = flowUv.mul(3).sub(vec2(0, time.mul(0.07))).add(0.5)
      const n1 = texture(uNormalMap, nUv1).rgb.mul(2).sub(1)
      const n2 = texture(uNormalMap, nUv2).rgb.mul(2).sub(1)
      // waterNormal: keep normalize safe (avoid NaN on zero vector).
      const waterN = normalize(vec3(n1.x.add(n2.x), n1.y.add(n2.y), max(n1.z, 0.001)))

      // World position + view direction for Fresnel.
      const worldPos = modelWorldMatrix.mul(vec4(positionLocal, 1)).xyz
      const viewDir = normalize(cameraPosition.sub(worldPos))
      const fresnel = pow(sub(1, max(dot(viewDir, vec3(0, 1, 0)), 0)), 3)

      // Water color with noise.
      const n = valueNoise(flowUv.mul(15)).mul(0.3)
      const nHi = valueNoise(flowUv.mul(30).sub(vec2(0, time.mul(0.1)))).mul(0.15)
      const waveBand = sin(flowUv.y.mul(40).add(time.mul(2))).mul(0.02)

      let deepColor = mix(uColor1, uColor2, vuv.x.add(n))
      deepColor = deepColor.add(nHi.mul(0.3))
      let color = mix(deepColor, uColor3, fresnel.mul(0.6))

      // Sparkle.
      const sparkle = valueNoise(flowUv.mul(50)).mul(
        valueNoise(flowUv.mul(80).sub(vec2(0, time))),
      )
      color = color.add(uColor3.mul(sparkle).mul(0.15).mul(fresnel.add(0.5)))

      // Edge fade (banks).
      const edgeFade = smoothstep(0, 0.15, vuv.x).mul(smoothstep(1, 0.85, vuv.x))
      const edgeFadeZ = smoothstep(0, 0.05, vuv.y).mul(smoothstep(1, 0.95, vuv.y))

      let alpha = float(0.7).add(n.mul(0.15)).add(waveBand)
      alpha = alpha.mul(edgeFade).mul(edgeFadeZ)

      return vec4(color.add(waveBand.mul(0.1)), alpha)
    })()

    return mat
  }, [normalMap, uColor1, uColor2, uColor3, uNormalMap])

  // No uTime plumbing needed — TSL `time` node auto-advances.
  useFrame(() => {})

  return <mesh ref={meshRef} geometry={geometry} material={material} />
}
