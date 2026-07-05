// Shared WebGPU renderer factory for all <Canvas> instances.
//
// R3F v9 + three r184: WebGPURenderer is the unified entry. It transparently
// falls back to WebGL2 when WebGPU is unavailable (Safari < 17.4, older
// mobile). TSL shaders compile to WGSL on WebGPU and GLSL on WebGL2.
//
// The factory MUST be async and MUST await renderer.init() — WebGPU adapter
// acquisition is async. R3F v9's `gl` prop accepts this async form.
//
// All Canvas elements import `createRenderer` from here so renderer config
// (tone mapping, color space, antialias) lives in one place.

import { WebGPURenderer } from 'three/webgpu'
import * as THREE from 'three/webgpu'

export interface RendererOptions {
  antialias?: boolean
  powerPreference?: 'default' | 'high-performance' | 'low-power'
}

/**
 * Returns an async factory suitable for R3F v9's `<Canvas gl={...}>` prop.
 * The factory receives the canvas element from R3F.
 */
export function createRenderer(options: RendererOptions = {}) {
  return async (canvas: HTMLCanvasElement) => {
    const renderer = new WebGPURenderer({
      canvas,
      antialias: options.antialias ?? true,
      powerPreference: options.powerPreference ?? 'high-performance',
    })
    await renderer.init()

    // ACES tone mapping + sRGB output — the cinematic grade (PostFX) used to
    // set this on the renderer directly. Until Phase D re-adds the TSL
    // post-processing chain, bake tone mapping in here so colors look right.
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05

    return renderer
  }
}
