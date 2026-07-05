// WebGL impostor baker — renders a tree's LOD0 into 2 albedo billboards
// (front + side ortho views) for use as the farthest LOD level.
//
// Adapted from SeedThree's impostor.js (MIT, Copyright (c) 2026 SkyeShark),
// rewritten for three.js WebGLRenderer:
//   - WebGLRenderTarget instead of WebGPU RenderTarget
//   - renderer.readRenderTargetPixels (sync) instead of readRenderTargetPixelsAsync
//   - We bake ONLY albedo (vs SeedThree's 4 channels: albedo/normal/roughness/
//     translucency). At billboard distance the SSS/normal detail is imperceptible,
//     and a single-channel bake keeps this module ~150 lines vs ~600.
//
// Output: { frontMap, sideMap, size } — two CanvasTextures + world height of
// the tree (so the caller can size the billboard planes correctly).

import * as THREE from 'three/webgpu'

const linToSrgb = (u: number): number => {
  const c = u / 255
  return Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055))
}

// Flood opaque edge colors into transparent margins (color only, alpha stays 0)
// so filtering at the alpha edge never blends toward black. Ported verbatim.
function dilate(data: Uint8ClampedArray, w: number, h: number, passes: number): void {
  const filled = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) filled[i] = data[i * 4 + 3] > 8 ? 1 : 0
  for (let p = 0; p < passes; p++) {
    const next = filled.slice()
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x
        if (filled[i]) continue
        let r = 0,
          g = 0,
          b = 0,
          n = 0
        if (x > 0 && filled[i - 1]!) {
          const k = (i - 1) * 4
          r += data[k]!
          g += data[k + 1]!
          b += data[k + 2]!
          n++
        }
        if (x < w - 1 && filled[i + 1]!) {
          const k = (i + 1) * 4
          r += data[k]!
          g += data[k + 1]!
          b += data[k + 2]!
          n++
        }
        if (y > 0 && filled[i - w]!) {
          const k = (i - w) * 4
          r += data[k]!
          g += data[k + 1]!
          b += data[k + 2]!
          n++
        }
        if (y < h - 1 && filled[i + w]!) {
          const k = (i + w) * 4
          r += data[k]!
          g += data[k + 1]!
          b += data[k + 2]!
          n++
        }
        if (n) {
          const k = i * 4
          data[k] = r / n
          data[k + 1] = g / n
          data[k + 2] = b / n
          next[i] = 1
        }
      }
    }
    filled.set(next)
  }
}

function flipRows(data: Uint8ClampedArray, w: number, h: number): void {
  const row = new Uint8ClampedArray(w * 4)
  for (let y = 0; y < h >> 1; y++) {
    const a = y * w * 4,
      b = (h - 1 - y) * w * 4
    row.set(data.subarray(a, a + w * 4))
    data.copyWithin(a, b, b + w * 4)
    data.set(row, b)
  }
}

export interface BakeOptions {
  /** render-target resolution per side */
  size?: number
  /** alpha-dilation passes (kills bilinear dark halos) */
  dilatePasses?: number
}

export interface BakeResult {
  frontMap: THREE.CanvasTexture
  sideMap: THREE.CanvasTexture
  /** world-space height of the tree — for billboard plane sizing */
  size: number
}

/**
 * Bake `sourceRoot` (a tree Group or LOD) into front + side albedo billboards.
 *
 * The source is rendered with flat-white lighting (HemisphereLight intensity 1
 * on a white background, materials' lighting contribution washed out by using
 * MeshBasicMaterial overrides via `overrideMaterial`). Output alpha = object
 * coverage (transparent background). After readback we dilate alpha edges and
 * pack into CanvasTextures.
 *
 * The renderer's clear color is preserved; this function is a side-effecting
 * guest on the renderer.
 */
export function bakeImpostor(
  renderer: THREE.WebGLRenderer,
  sourceRoot: THREE.Object3D,
  opts: BakeOptions = {},
): BakeResult {
  const size = opts.size ?? 256
  const dilatePasses = opts.dilatePasses ?? 12

  // Compute bounds to frame the ortho cameras tightly.
  const bbox = new THREE.Box3().setFromObject(sourceRoot)
  const dim = new THREE.Vector3()
  bbox.getSize(dim)
  const center = new THREE.Vector3()
  bbox.getCenter(center)
  const half = Math.max(dim.x, dim.y, dim.z) / 2
  const worldHeight = dim.y

  // Shared scene/cam setup; we reposition the camera per view.
  const scene = new THREE.Scene()
  scene.background = null
  scene.add(sourceRoot)
  scene.overrideMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
  })

  const cam = new THREE.OrthographicCamera(-half, half, half, -half, 0.1, half * 6)
  cam.lookAt(center)

  const rt = new THREE.WebGLRenderTarget(size, size, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  })

  // Save renderer state.
  const prevRT = renderer.getRenderTarget()
  const prevClear = new THREE.Color()
  renderer.getClearColor(prevClear)
  const prevClearAlpha = renderer.getClearAlpha()
  const prevAutoClear = renderer.autoClear
  renderer.autoClear = true
  renderer.setClearColor(0x000000, 0)

  renderer.setRenderTarget(rt)

  // ── front view (camera at +Z looking toward -Z) ──
  cam.position.set(center.x, center.y, center.z + half * 3)
  cam.lookAt(center)
  cam.updateProjectionMatrix()
  renderer.render(scene, cam)
  const frontPixels = new Uint8Array(size * size * 4)
  renderer.readRenderTargetPixels(rt, 0, 0, size, size, frontPixels)

  // ── side view (camera at +X looking toward -X) ──
  cam.position.set(center.x + half * 3, center.y, center.z)
  cam.lookAt(center)
  cam.updateProjectionMatrix()
  renderer.render(scene, cam)
  const sidePixels = new Uint8Array(size * size * 4)
  renderer.readRenderTargetPixels(rt, 0, 0, size, size, sidePixels)

  // Restore renderer state.
  renderer.setRenderTarget(prevRT)
  renderer.setClearColor(prevClear, prevClearAlpha)
  renderer.autoClear = prevAutoClear
  rt.dispose()
  scene.overrideMaterial = null

  // ── post-process: linear→sRGB (render targets skip the output transform),
  //    flip rows (WebGL readback is bottom-first), dilate alpha edges. ──
  const frontMap = pixelsToTexture(frontPixels, size, dilatePasses)
  const sideMap = pixelsToTexture(sidePixels, size, dilatePasses)

  return { frontMap, sideMap, size: worldHeight }
}

function pixelsToTexture(pixels: Uint8Array, size: number, dilatePasses: number): THREE.CanvasTexture {
  const data = new Uint8ClampedArray(pixels)
  // sRGB convert (albedo channel only — alpha stays raw).
  for (let i = 0; i < data.length; i += 4) {
    data[i] = linToSrgb(data[i]!)
    data[i + 1] = linToSrgb(data[i + 1]!)
    data[i + 2] = linToSrgb(data[i + 2]!)
  }
  // WebGL readback is bottom-first → flip to top-first for canvas drawing.
  flipRows(data, size, size)
  dilate(data, size, size, dilatePasses)

  if (typeof document === 'undefined') {
    // SSR/test: return a placeholder DataTexture (won't render meaningfully).
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
    tex.needsUpdate = true
    return tex as unknown as THREE.CanvasTexture
  }
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const imageData = ctx.createImageData(size, size)
  imageData.data.set(data)
  ctx.putImageData(imageData, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}
