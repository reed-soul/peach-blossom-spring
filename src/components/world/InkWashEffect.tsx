// Ink-wash post-processing — TSL port of the original 265-line GLSL shader.
//
// This is the project's core visual signature: a Sobel-edge + layered ink-wash
// + Worley pigment-bleed + fly-white + paper-grain + vignette effect that
// renders the peach forest scene in the style of traditional Chinese ink
// painting.
//
// WebGPU/TSL port notes:
//   - The original was a manual WebGLRenderTarget + ShaderMaterial that hijacked
//     the render loop. Under WebGPU we use three's PostProcessing + a TSL Fn
//     node that operates on the scene pass texture.
//   - All noise functions (hash/value-noise/fbm/worley) are rewritten as TSL Fn.
//   - Visual fidelity target: preserve Sobel edges + ink layers + paper grain +
//     vignette (the dominant features). Worley pigment-bleed is included but is
//     the most likely to need tuning once you see it in-browser.
//
// Ported from the project's original src/components/world/InkWashEffect.tsx (GLSL).

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three/webgpu'
import { PostProcessing } from 'three/webgpu'
import {
  pass,
  Fn,
  uniform,
  uv,
  time,
  texture,
  vec2,
  vec3,
  vec4,
  float,
  fract,
  floor,
  sin,
  cos,
  dot,
  mix,
  smoothstep,
  step,
  length,
  sqrt,
  atan,
  pow,
  max,
  min,
  sub,
  add,
  mul,
  luminance,
} from 'three/tsl'

// ── Noise primitives (TSL Fn ports of the GLSL originals) ──

const hash = Fn(([p]) => {
  // hash(vec2) → fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123)
  return fract(sin(dot(p, vec2(127.1, 311.7))).mul(43758.5453123))
})

const valueNoise = Fn(([p]) => {
  const i = floor(p)
  const f = fract(p)
  const ff = f.mul(f).mul(sub(3, f.mul(2))) // f*f*(3-2f)
  const a = hash(i)
  const b = hash(i.add(vec2(1, 0)))
  const c = hash(i.add(vec2(0, 1)))
  const d = hash(i.add(vec2(1, 1)))
  return mix(mix(a, b, ff.x), mix(c, d, ff.x), ff.y)
})

const fbm = Fn(([p]) => {
  // 3-octave fbm (GLSL loop unrolled).
  let v = valueNoise(p)
  let freq = p.mul(2)
  v = v.add(valueNoise(freq).mul(0.5))
  freq = freq.mul(2)
  v = v.add(valueNoise(freq).mul(0.25))
  return v
})

const worley = Fn(([p]) => {
  const i = floor(p)
  const f = fract(p)
  let minDist = float(1)
  for (let y = -1; y <= 1; y++) {
    for (let x = -1; x <= 1; x++) {
      const neighbor = vec2(x, y)
      const point = neighbor.add(
        vec2(hash(i.add(neighbor)), hash(i.add(neighbor).add(vec2(17, 31)))),
      )
      minDist = min(minDist, length(point.sub(f)))
    }
  }
  return minDist
})

const worleyFbm = Fn(([p]) => {
  return worley(p.mul(4)).mul(0.5).add(worley(p.mul(8)).mul(0.3)).add(worley(p.mul(16)).mul(0.2))
})

// ── Main ink-wash effect (TSL Fn) ──
// Receives the scenePass texture node + uniforms; returns the processed color.
const inkWash = Fn(([sceneTexture, uInkIntensity, uEdgeStrength, uPaperRoughness, uResolution]) => {
  const uvCoord = uv()
  const texel = float(1).div(uResolution)

  // Sobel edge detection on luminance.
  const sampleLum = (off: ReturnType<typeof vec2>) =>
    luminance(texture(sceneTexture, uvCoord.add(off)).rgb)

  const tl = sampleLum(vec2(-texel.x, texel.y))
  const t = sampleLum(vec2(0, texel.y))
  const tr = sampleLum(vec2(texel.x, texel.y))
  const l = sampleLum(vec2(-texel.x, 0))
  const r = sampleLum(vec2(texel.x, 0))
  const bl = sampleLum(vec2(-texel.x, -texel.y))
  const b = sampleLum(vec2(0, -texel.y))
  const br = sampleLum(vec2(texel.x, -texel.y))

  const gx = tl.negate().sub(l.mul(2)).sub(bl).add(tr).add(r.mul(2)).add(br)
  const gy = tl.negate().sub(t.mul(2)).sub(tr).add(bl).add(b.mul(2)).add(br)
  const edgeMag = sqrt(gx.mul(gx).add(gy.mul(gy)))

  const edgeAngle = atan(gy, gx)
  const strokeNoise = fbm(vec2(cos(edgeAngle), sin(edgeAngle)).mul(8).add(uvCoord.mul(120)))
  const threshold = mix(float(0.04), float(0.18), sub(1, uEdgeStrength.mul(0.4)))
  const strokeWidth = mix(float(0.6), float(1.4), strokeNoise)
  const edge = smoothstep(threshold, threshold.add(0.12), edgeMag.mul(uEdgeStrength).mul(strokeWidth))

  // Layered ink wash: 3 paper tones × 3 ink tones, blended by luminance.
  const color = texture(sceneTexture, uvCoord).rgb
  const lum = luminance(color)

  const paperNear = vec3(0.94, 0.9, 0.82)
  const paperMid = vec3(0.96, 0.93, 0.87)
  const paperFar = vec3(0.98, 0.96, 0.91)
  const inkNear = vec3(0.06, 0.04, 0.02)
  const inkMid = vec3(0.12, 0.08, 0.05)
  const inkFar = vec3(0.22, 0.18, 0.14)

  const nearLayer = smoothstep(0.55, 0.85, lum)
  const farLayer = smoothstep(0.15, 0.45, lum)

  let paperCol = mix(paperFar, paperMid, farLayer)
  paperCol = mix(paperCol, paperNear, nearLayer)

  let inkCol = mix(inkFar, inkMid, farLayer)
  inkCol = mix(inkCol, inkNear, nearLayer)

  let wash = mix(paperCol, inkCol, lum.mul(uInkIntensity))
  wash = mix(wash, inkCol.mul(0.55), edge.mul(0.75))

  // Paper grain (fbm at high frequency).
  const grain = fbm(uvCoord.mul(300)).mul(uPaperRoughness)
  wash = wash.add(sub(grain, 0.5).mul(0.06))

  // Fly-white: sparse ink-grain highlights in dark regions.
  const darkMask = smoothstep(0.45, 0.15, lum)
  const coarseGrain = step(0.92, hash(floor(uvCoord.mul(uResolution).mul(0.8))))
  const fineGrain = step(0.97, hash(floor(uvCoord.mul(uResolution).mul(1.6).add(vec2(13, 7)))))
  const flyWhite = coarseGrain.mul(0.08).add(fineGrain.mul(0.04)).mul(darkMask)
  wash = wash.add(vec3(flyWhite))

  // Vignette.
  const vignette = sub(1, smoothstep(0.4, 1.4, length(uvCoord.sub(0.5)).mul(2)))
  wash = wash.mul(mix(0.7, 1, vignette))

  // Slow settle breathing (subtle brightness oscillation).
  const settle = sin(time.mul(0.1)).mul(0.008).add(1)
  wash = wash.mul(settle)

  return vec4(wash, 1)
})

export interface InkWashEffectProps {
  inkIntensity?: number
  edgeStrength?: number
  paperRoughness?: number
}

export function InkWashEffect({
  inkIntensity = 1.2,
  edgeStrength = 1.5,
  paperRoughness = 0.3,
}: InkWashEffectProps) {
  const { scene, camera, size, gl } = useThree()
  const postRef = useRef<PostProcessing | null>(null)

  const uInkIntensity = uniform(inkIntensity)
  const uEdgeStrength = uniform(edgeStrength)
  const uPaperRoughness = uniform(paperRoughness)
  const uResolution = uniform(new THREE.Vector2(size.width, size.height))

  useEffect(() => {
    uInkIntensity.value = inkIntensity
    uEdgeStrength.value = edgeStrength
    uPaperRoughness.value = paperRoughness
  }, [inkIntensity, edgeStrength, paperRoughness, uInkIntensity, uEdgeStrength, uPaperRoughness])

  useEffect(() => {
    uResolution.value.set(size.width, size.height)
  }, [size, uResolution])

  useEffect(() => {
    // Build the PostProcessing pipeline once. R3F v9 + WebGPU: PostProcessing
    // takes over rendering when its outputNode is set on the renderer.
    const post = new PostProcessing(gl as any)
    const scenePass = pass(scene, camera)
    post.outputNode = inkWash(scenePass, uInkIntensity, uEdgeStrength, uPaperRoughness, uResolution)
    postRef.current = post
    return () => {
      postRef.current = null
    }
  }, [gl, scene, camera, uInkIntensity, uEdgeStrength, uPaperRoughness, uResolution])

  useFrame(() => {
    // PostProcessing.render() drives the WebGPU render pipeline. R3F's own
    // render loop is bypassed when outputNode is set this way (the PostProcessing
    // instance owns the frame).
    postRef.current?.render()
  })

  return null
}
