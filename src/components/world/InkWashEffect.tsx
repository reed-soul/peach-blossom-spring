import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

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
uniform vec2 uResolution;
varying vec2 vUv;

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

float fbm(vec2 p, int octaves) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    if (i >= octaves) break;
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

// Worley / cellular noise — approximates watercolor pigment clumping
float worley(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float minDist = 1.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 point = neighbor + vec2(
        hash(i + neighbor),
        hash(i + neighbor + vec2(17.0, 31.0))
      );
      minDist = min(minDist, length(point - f));
    }
  }
  return minDist;
}

float worleyFbm(vec2 p) {
  return worley(p * 4.0) * 0.5 + worley(p * 8.0) * 0.3 + worley(p * 16.0) * 0.2;
}

float luminance(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

// Enhanced edge detection with brush-stroke directional noise
float edgeDetect(vec2 uv, float strength) {
  vec2 texel = 1.0 / uResolution;

  float tl = luminance(texture2D(tDiffuse, uv + vec2(-texel.x, texel.y)).rgb);
  float t  = luminance(texture2D(tDiffuse, uv + vec2(0.0, texel.y)).rgb);
  float tr = luminance(texture2D(tDiffuse, uv + vec2(texel.x, texel.y)).rgb);
  float l  = luminance(texture2D(tDiffuse, uv + vec2(-texel.x, 0.0)).rgb);
  float r  = luminance(texture2D(tDiffuse, uv + vec2(texel.x, 0.0)).rgb);
  float bl = luminance(texture2D(tDiffuse, uv + vec2(-texel.x, -texel.y)).rgb);
  float b  = luminance(texture2D(tDiffuse, uv + vec2(0.0, -texel.y)).rgb);
  float br = luminance(texture2D(tDiffuse, uv + vec2(texel.x, -texel.y)).rgb);

  float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
  float gy = -tl - 2.0 * t - tr + bl + 2.0 * b + br;
  float edgeMag = sqrt(gx * gx + gy * gy);

  // Directional noise modulates stroke thickness along edge tangent
  float edgeAngle = atan(gy, gx);
  float strokeNoise = fbm(vec2(cos(edgeAngle), sin(edgeAngle)) * 8.0 + uv * 120.0, 2);
  float threshold = mix(0.04, 0.18, 1.0 - strength * 0.4);
  float strokeWidth = mix(0.6, 1.4, strokeNoise);

  return smoothstep(threshold, threshold + 0.12, edgeMag * strength * strokeWidth);
}

// Pigment bleed via Worley noise — uneven watercolor diffusion
vec3 pigmentBleed(vec2 uv) {
  float cell = worleyFbm(uv * 25.0);
  float bleed = (cell - 0.35) * 0.008;

  vec2 offset = vec2(
    worley(uv * 18.0 + vec2(3.7, 1.2)) - 0.5,
    worley(uv * 18.0 + vec2(9.1, 5.4)) - 0.5
  ) * (0.003 + bleed);

  vec3 center = texture2D(tDiffuse, uv + offset).rgb;
  vec3 spread = texture2D(tDiffuse, uv + offset * 2.5).rgb;
  float wetness = smoothstep(0.2, 0.7, 1.0 - cell);

  return mix(center, spread, wetness * 0.35);
}

// Multi-layer ink wash: near dark/rich, mid balanced, far pale/gray
vec3 layeredInkWash(vec3 color, vec2 uv) {
  float lum = luminance(color);
  float edge = edgeDetect(uv, uEdgeStrength);

  vec3 paperNear = vec3(0.94, 0.90, 0.82);
  vec3 paperMid  = vec3(0.96, 0.93, 0.87);
  vec3 paperFar  = vec3(0.98, 0.96, 0.91);

  vec3 inkNear = vec3(0.06, 0.04, 0.02);
  vec3 inkMid  = vec3(0.12, 0.08, 0.05);
  vec3 inkFar  = vec3(0.22, 0.18, 0.14);

  float nearLayer = smoothstep(0.55, 0.85, lum);
  float farLayer  = smoothstep(0.15, 0.45, lum);

  vec3 paper = mix(paperFar, paperMid, farLayer);
  paper = mix(paper, paperNear, nearLayer);

  vec3 ink = mix(inkFar, inkMid, farLayer);
  ink = mix(ink, inkNear, nearLayer);

  vec3 wash = mix(paper, ink, lum * uInkIntensity);
  wash = mix(wash, ink * 0.55, edge * 0.75);

  // Paper grain
  float paper = fbm(uv * 300.0, 3) * uPaperRoughness;
  wash += (paper - 0.5) * 0.06;

  return wash;
}

// Fly-white: sparse ink-grain highlights in dark regions
vec3 applyFlyWhite(vec3 color, vec2 uv) {
  float lum = luminance(color);
  float darkMask = smoothstep(0.45, 0.15, lum);
  float grain = step(0.92, hash(floor(uv * uResolution * 0.8)));
  float fineGrain = step(0.97, hash(floor(uv * uResolution * 1.6 + vec2(13.0, 7.0))));

  float flyWhite = (grain * 0.08 + fineGrain * 0.04) * darkMask;
  return color + vec3(flyWhite);
}

void main() {
  vec2 uv = vUv;

  vec3 color = pigmentBleed(uv);
  color = layeredInkWash(color, uv);
  color = applyFlyWhite(color, uv);

  float vignette = 1.0 - smoothstep(0.4, 1.4, length(uv - 0.5) * 2.0);
  color *= mix(0.7, 1.0, vignette);

  float settle = sin(uTime * 0.1) * 0.008 + 1.0;
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
  const orthoSceneRef = useRef<THREE.Scene | null>(null)
  const orthoCameraRef = useRef<THREE.OrthographicCamera | null>(null)

  useEffect(() => {
    const w = Math.max(1, size.width)
    const h = Math.max(1, size.height)
    const rt = new THREE.WebGLRenderTarget(w, h, {
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
        uResolution: { value: new THREE.Vector2(w, h) },
      },
    })
    materialRef.current = mat

    const qScene = new THREE.Scene()
    const qCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    orthoSceneRef.current = qScene
    orthoCameraRef.current = qCamera

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat)
    qScene.add(quad)

    return () => {
      rt.dispose()
      mat.dispose()
      quad.geometry.dispose()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!materialRef.current) return
    materialRef.current.uniforms.uInkIntensity.value = inkIntensity
    materialRef.current.uniforms.uEdgeStrength.value = edgeStrength
    materialRef.current.uniforms.uPaperRoughness.value = paperRoughness
  }, [inkIntensity, edgeStrength, paperRoughness])

  useFrame((state) => {
    if (!materialRef.current || !renderTargetRef.current) return

    const rt = renderTargetRef.current
    const w = Math.max(1, size.width)
    const h = Math.max(1, size.height)

    if (rt.width !== w || rt.height !== h) {
      rt.setSize(w, h)
    }

    materialRef.current.uniforms.uResolution.value.set(w, h)
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime

    gl.setRenderTarget(rt)
    gl.render(scene, camera)

    materialRef.current.uniforms.tDiffuse.value = rt.texture
    gl.setRenderTarget(null)
    if (orthoSceneRef.current && orthoCameraRef.current) {
      gl.render(orthoSceneRef.current, orthoCameraRef.current)
    }
  })

  return null
}
