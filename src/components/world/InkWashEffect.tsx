import { useRef, useEffect } from 'react'
import { useFrame, useThree, extend } from '@react-three/fiber'
import * as THREE from 'three'

// Ink wash post-processing effect
const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = `
uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uInkIntensity;
uniform float uEdgeStrength;
uniform float uPaperRoughness;
varying vec2 vUv;

// Simplex-ish noise for paper texture
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
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

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

// Sobel edge detection
float edgeDetect(vec2 uv, float strength) {
  vec2 texel = vec2(1.0 / 800.0, 1.0 / 600.0);
  
  float tl = dot(texture2D(tDiffuse, uv + vec2(-texel.x, texel.y)).rgb, vec3(0.299, 0.587, 0.114));
  float t  = dot(texture2D(tDiffuse, uv + vec2(0.0, texel.y)).rgb, vec3(0.299, 0.587, 0.114));
  float tr = dot(texture2D(tDiffuse, uv + vec2(texel.x, texel.y)).rgb, vec3(0.299, 0.587, 0.114));
  float l  = dot(texture2D(tDiffuse, uv + vec2(-texel.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
  float r  = dot(texture2D(tDiffuse, uv + vec2(texel.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
  float bl = dot(texture2D(tDiffuse, uv + vec2(-texel.x, -texel.y)).rgb, vec3(0.299, 0.587, 0.114));
  float b  = dot(texture2D(tDiffuse, uv + vec2(0.0, -texel.y)).rgb, vec3(0.299, 0.587, 0.114));
  float br = dot(texture2D(tDiffuse, uv + vec2(texel.x, -texel.y)).rgb, vec3(0.299, 0.587, 0.114));
  
  float gx = -tl - 2.0*l - bl + tr + 2.0*r + br;
  float gy = -tl - 2.0*t - tr + bl + 2.0*b + br;
  
  return smoothstep(0.02, 0.15, sqrt(gx*gx + gy*gy) * strength);
}

// Ink diffusion effect
vec3 inkDiffuse(vec3 color, vec2 uv) {
  float ink = edgeDetect(uv, uEdgeStrength);
  
  // Desaturate with ink tone
  float gray = dot(color, vec3(0.299, 0.587, 0.114));
  
  // Ink palette: warm cream → dark brown-black
  vec3 paperColor = vec3(0.95, 0.92, 0.85);
  vec3 inkColor = vec3(0.08, 0.05, 0.03);
  
  // Mix based on luminance
  vec3 inkWash = mix(paperColor, inkColor, gray * uInkIntensity);
  
  // Add ink edges
  inkWash = mix(inkWash, inkColor * 0.6, ink * 0.7);
  
  // Paper texture
  float paper = fbm(uv * 300.0) * uPaperRoughness;
  inkWash += (paper - 0.5) * 0.06;
  
  return inkWash;
}

// Watercolor bleed effect
vec3 watercolorBleed(vec2 uv) {
  vec3 sum = vec3(0.0);
  float total = 0.0;
  
  for (float x = -2.0; x <= 2.0; x += 1.0) {
    for (float y = -2.0; y <= 2.0; y += 1.0) {
      vec2 offset = vec2(x, y) * 0.002;
      float n = fbm(uv * 20.0 + offset * 5.0);
      offset += vec2(n - 0.5) * 0.003;
      vec3 s = texture2D(tDiffuse, uv + offset).rgb;
      float w = 1.0 - length(vec2(x, y)) * 0.3;
      sum += s * w;
      total += w;
    }
  }
  
  return sum / total;
}

void main() {
  vec2 uv = vUv;
  
  // Watercolor pre-pass
  vec3 color = watercolorBleed(uv);
  
  // Ink wash effect
  color = inkDiffuse(color, uv);
  
  // Subtle vignette
  float vignette = 1.0 - smoothstep(0.4, 1.4, length(uv - 0.5) * 2.0);
  color *= mix(0.7, 1.0, vignette);
  
  // Very slight animation - ink settling
  float settle = sin(uTime * 0.1) * 0.01 + 1.0;
  color *= settle;
  
  gl_FragColor = vec4(color, 1.0);
}
`

interface InkWashEffectProps {
  inkIntensity?: number
  edgeStrength?: number
  paperRoughness?: number
}

export function InkWashEffect({
  inkIntensity = 1.2,
  edgeStrength = 1.5,
  paperRoughness = 0.3,
}: InkWashEffectProps) {
  const { size, gl, scene, camera } = useThree()
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const renderTargetRef = useRef<THREE.WebGLRenderTarget | null>(null)
  const quadRef = useRef<THREE.Mesh>(null)
  const orthoSceneRef = useRef<THREE.Scene | null>(null)
  const orthoCameraRef = useRef<THREE.OrthographicCamera | null>(null)

  useEffect(() => {
    const rt = new THREE.WebGLRenderTarget(size.width, size.height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    })
    renderTargetRef.current = rt

    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uInkIntensity: { value: inkIntensity },
        uEdgeStrength: { value: edgeStrength },
        uPaperRoughness: { value: paperRoughness },
      },
    })
    materialRef.current = mat

    // Fullscreen quad
    const qScene = new THREE.Scene()
    const qCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    orthoSceneRef.current = qScene
    orthoCameraRef.current = qCamera

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat)
    qScene.add(quad)
    quadRef.current = quad

    return () => {
      rt.dispose()
      mat.dispose()
      quad.geometry.dispose()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((state) => {
    if (!materialRef.current || !renderTargetRef.current) return

    const rt = renderTargetRef.current
    // Resize if needed
    if (rt.width !== size.width || rt.height !== size.height) {
      rt.setSize(size.width, size.height)
    }

    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime

    // Render scene to texture
    gl.setRenderTarget(rt)
    gl.render(scene, camera)

    // Apply post-processing
    materialRef.current.uniforms.tDiffuse.value = rt.texture
    gl.setRenderTarget(null)
    if (orthoSceneRef.current && orthoCameraRef.current) {
      gl.render(orthoSceneRef.current, orthoCameraRef.current)
    }
  })

  return null
}
