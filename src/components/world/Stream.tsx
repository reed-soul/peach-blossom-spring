import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createNoise2D } from 'simplex-noise'
import { PbrTextures } from '../../cinematic/textures/PbrTextures'

const noise2D = createNoise2D()

export function Stream() {
  const meshRef = useRef<THREE.Mesh>(null)

  const { geometry, flowUvs } = useMemo(() => {
    // Generate stream path points
    const pathPoints: THREE.Vector3[] = []
    const steps = 80
    const length = 110
    for (let i = 0; i < steps; i++) {
      const t = i / steps
      const z = -length / 2 + t * length
      const x = Math.sin(t * Math.PI * 3) * 6 + Math.sin(t * Math.PI * 7) * 2
      const y = -0.6 + noise2D(x * 0.05, z * 0.05) * 0.2
      pathPoints.push(new THREE.Vector3(x, y, z))
    }

    // Build ribbon geometry along path
    const width = 3.5
    const verts: number[] = []
    const uvs: number[] = []
    const indices: number[] = []
    const normals: number[] = []

    for (let i = 0; i < pathPoints.length - 1; i++) {
      const p0 = pathPoints[i]
      const p1 = pathPoints[i + 1]
      const dir = p1.clone().sub(p0).normalize()
      const perp = new THREE.Vector3(-dir.z, 0, dir.x)

      const u0 = i / (pathPoints.length - 1)
      const u1 = (i + 1) / (pathPoints.length - 1)

      // Left and right vertices
      verts.push(
        p0.x - perp.x * width, p0.y, p0.z - perp.z * width,
        p0.x + perp.x * width, p0.y, p0.z + perp.z * width,
        p1.x - perp.x * width, p1.y, p1.z - perp.z * width,
        p1.x + perp.x * width, p1.y, p1.z + perp.z * width,
      )

      uvs.push(0, u0, 1, u0, 0, u1, 1, u1)

      normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0)

      const base = i * 4
      indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3)
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()

    return { geometry: geo, flowUvs: uvs }
  }, [])

  const material = useMemo(() => {
    const normalMap = PbrTextures.waterNormal([4, 8])
    return new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color(0x4a8b8b) },
        uColor2: { value: new THREE.Color(0x2e6b6b) },
        uColor3: { value: new THREE.Color(0xffffff) },
        uNormalMap: { value: normalMap },
      },
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vViewDir;
        void main() {
          vUv = uv;
          vec3 pos = position;
          // 顶点波动：让水面真的有起伏（不再平带）
          pos.y += sin(pos.z * 1.5 + uTime * 1.2) * 0.08
                 + sin(pos.x * 2.0 + uTime * 0.9) * 0.05;
          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPos = worldPos.xyz;
          // 视线方向（用于 Fresnel）：相机世界位 - 顶点世界位
          vec4 mvPos = viewMatrix * worldPos;
          vViewDir = normalize(cameraPosition - worldPos.xyz);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        uniform sampler2D uNormalMap;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vViewDir;

        // Simple noise
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        void main() {
          // Flowing UV（双流法线采样，模拟水面凹凸流动）
          vec2 flowUv = vUv;
          flowUv.y += uTime * 0.08;
          vec2 nUv1 = flowUv * 3.0 + vec2(0.0, uTime * 0.05);
          vec2 nUv2 = flowUv * 3.0 - vec2(0.0, uTime * 0.07) + 0.5;
          vec3 n1 = texture2D(uNormalMap, nUv1).rgb * 2.0 - 1.0;
          vec3 n2 = texture2D(uNormalMap, nUv2).rgb * 2.0 - 1.0;
          vec3 waterNormal = normalize(vec3(n1.xy + n2.xy, n1.z));

          // Fresnel：近水平角（视线越平行水面）反射越强
          float fresnel = pow(1.0 - max(dot(vViewDir, vec3(0.0, 1.0, 0.0)), 0.0), 3.0);

          // Water color with noise
          float n = noise(flowUv * 15.0) * 0.3;
          float n2 = noise(flowUv * 30.0 - uTime * 0.1) * 0.15;
          float wave = sin(flowUv.y * 40.0 + uTime * 2.0) * 0.02;

          vec3 deepColor = mix(uColor1, uColor2, vUv.x + n);
          deepColor += n2 * 0.3;
          // Fresnel 把高光天色混到近水平角
          vec3 color = mix(deepColor, uColor3, fresnel * 0.6);

          // Sparkle on water surface（用法线扰动增强高光）
          float sparkle = noise(flowUv * 50.0) * noise(flowUv * 80.0 - uTime);
          color += uColor3 * sparkle * 0.15 * (0.5 + fresnel);

          // Edge darkening (banks)
          float edgeFade = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
          float edgeFadeZ = smoothstep(0.0, 0.05, vUv.y) * smoothstep(1.0, 0.95, vUv.y);

          float alpha = 0.7 + n * 0.15 + wave;
          alpha *= edgeFade * edgeFadeZ;

          gl_FragColor = vec4(color + wave * 0.1, alpha);
        }
      `,
    })
  }, [])

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime
  })

  return <mesh ref={meshRef} geometry={geometry} material={material} />
}
