// Shared WebGPU renderer factory for all <Canvas> instances.
//
// R3F v9 + three r184: WebGPURenderer is the unified entry. It CAN fall back
// to WebGL2 automatically, but in practice on macOS Chrome the detection is
// unreliable: `navigator.gpu` exists but `requestAdapter()` returns null or
// hangs, so `renderer.init()` never resolves and the Canvas never mounts
// (visible as a black screen with no error).
//
// Fix: explicitly probe WebGPU adapter availability FIRST. If the probe fails
// or times out, construct WebGPURenderer with `forceWebGL: true` to use the
// reliable WebGL2 backend (TSL still compiles to GLSL on this path).
//
// The factory MUST be async and MUST await renderer.init().

import { WebGPURenderer } from 'three/webgpu'
import * as THREE from 'three/webgpu'

export interface RendererOptions {
  antialias?: boolean
  powerPreference?: 'default' | 'high-performance' | 'low-power'
}

/**
 * Probe whether WebGPU is actually usable (not just present). Returns false if
 * navigator.gpu is missing, requestAdapter() returns null, or the probe times
 * out (macOS Chrome can hang here on some GPU/driver combos).
 */
async function probeWebGPU(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.gpu) return false
  try {
    const adapter = await Promise.race([
      navigator.gpu.requestAdapter(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
    ])
    return adapter !== null
  } catch {
    return false
  }
}

/**
 * Returns an async factory suitable for R3F v9's `<Canvas gl={...}>` prop.
 * Probes WebGPU; falls back to WebGL2 backend (forceWebGL) when unavailable.
 */
export function createRenderer(options: RendererOptions = {}) {
  return async (props: { canvas: HTMLCanvasElement } & Record<string, unknown>) => {
    const webGPUAvailable = await probeWebGPU()
    const renderer = new WebGPURenderer({
      ...props,
      antialias: options.antialias ?? true,
      powerPreference: options.powerPreference ?? 'high-performance',
      forceWebGL: !webGPUAvailable,
    })
    await renderer.init()

    // ACES tone mapping + sRGB output.
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05

    if (!webGPUAvailable) {
      console.info('[renderer] WebGPU unavailable — using WebGL2 backend')
    }

    return renderer
  }
}
