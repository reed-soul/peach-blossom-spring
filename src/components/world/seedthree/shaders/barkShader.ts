// Bark (trunk + branches) shader for the HERO tree — a non-instanced
// MeshStandardMaterial with SeedThree's two-octave wind displacement injected
// via onBeforeCompile.
//
// Ported from SeedThree (MIT, Copyright (c) 2026 SkyeShark) TSL barkWindPosition.
//
// Inputs from buildBranchGeometry (branch-mesh.ts):
//   attribute float aWind;        — per-vertex wind weight (0 at trunk base → 1 at tips)
//   attribute vec3  aStemCenter;  — centerline point per vertex (sway phase)
//
// The sway PHASE uses the centerline (aStemCenter), not the surface vertex —
// otherwise a thick trunk's surface sways on a different phase than the
// centerline-anchored foliage, and skirts clip through the bark.

import * as THREE from 'three/webgpu'
import type { WindUniforms } from './windUniforms'
import { SWAY_GLSL } from './windUniforms'

export interface BarkShaderOptions {
  wind: WindUniforms
}

/**
 * Returns a MeshStandardMaterial whose vertex shader displaces vertices along
 * the wind direction based on the baked `aWind` weight. PBR lighting, shadows,
 * and normal maps are all preserved (the rest of the standard pipeline runs
 * unmodified).
 */
export function createBarkMaterial(
  base: THREE.MeshStandardMaterial,
  opts: BarkShaderOptions,
): THREE.MeshStandardMaterial {
  const mat = base.clone()

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWindStrength = opts.wind.uWindStrength
    shader.uniforms.uWindSpeed = opts.wind.uWindSpeed
    shader.uniforms.uTime = opts.wind.uTime
    shader.uniforms.uWindDir = opts.wind.uWindDir

    // ── vertex shader ──────────────────────────────────────────────────────
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `
          #include <common>
          uniform float uWindStrength;
          uniform float uWindSpeed;
          uniform float uTime;
          uniform vec3 uWindDir;
          attribute float aWind;
          attribute vec3 aStemCenter;
          ${SWAY_GLSL}
        `,
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `
          vec3 transformed = vec3(position);
          // Hero bark: amplitude from per-vertex aWind; phase from centerline.
          float amp = uWindStrength * 0.35 * aWind;
          vec3 centerWorld = (modelMatrix * vec4(aStemCenter, 1.0)).xyz;
          transformed += uWindDir * windSwayAt(centerWorld) * amp;
        `,
      )
  }

  // Tag for identification; the runtime doesn't read it.
  mat.userData.isBarkWindShader = true
  return mat
}
