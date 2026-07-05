// Shared WebGPU renderer factory for all <Canvas> instances.
//
// R3F v9 + three r184: WebGPURenderer is the unified entry. It transparently
// falls back to WebGL2 when WebGPU is unavailable (Safari < 17.4, older
// mobile). TSL shaders compile to WGSL on WebGPU and GLSL on WebGL2.
//
// The factory MUST be async and MUST await renderer.init() — WebGPU adapter
// acquisition is async. R3F v9's `gl` prop accepts this async form.
//
// IMPORTANT (R3F v9 API): the gl factory receives R3F's full state object
// (with { canvas, ... }) — NOT just the canvas element. Pass it through to
// WebGPURenderer's constructor as a single object.

import { WebGPURenderer } from 'three/webgpu'
import * as THREE from 'three/webgpu'

export interface RendererOptions {
  antialias?: boolean
  powerPreference?: 'default' | 'high-performance' | 'low-power'
}

/**
 * Returns an async factory suitable for R3F v9's `<Canvas gl={...}>` prop.
 * Pattern from ektogamat/r3f-webgpu-starter: pass the full props object to
 * WebGPURenderer, init async, return the renderer.
 */
export function createRenderer(options: RendererOptions = {}) {
  return async (props: { canvas: HTMLCanvasElement } & Record<string, unknown>) => {
    const renderer = new WebGPURenderer({
      ...props,
      antialias: options.antialias ?? true,
      powerPreference: options.powerPreference ?? 'high-performance',
    })
    await renderer.init()

    // ACES tone mapping + sRGB output — bake tone mapping here so colors look
    // right without PostFX (Phase D's TSL chain adds per-act grade on top).
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05

    return renderer
  }
}
