// Foliage (petal/leaf card) shader — instanced MeshStandardMaterial with:
//   1. Dome-normal canopy shading — replaces the card's geometric normals with
//      a world-space dome vector so crossed cards don't disagree (the classic
//      "one card lit, partner dark" bug). Ported from SeedThree leaf-cards.js
//      normalNode.
//   2. Barré-Brisebois SSS back-translucency — petals glow when backlit. A
//      wrap-diffuse term added at the end of the lighting pass, scaled by the
//      translucency map × per-instance aThickness × a transmitted color.
//   3. Per-instance tint — luminance-preserving colorize so each of the 4
//      peach-blossom colors reads at the right brightness. Uses the standard
//      vertexColors/instanceColor pipeline (no custom tint math here).
//   4. Instanced wind — phase from modelMatrix·aAnchorPos, direction from the
//      pre-baked aWindVec (= R⁻¹S⁻¹·windDir × weight), per-instance flutter.
//
// Ported from SeedThree (MIT, Copyright (c) 2026 SkyeShark) TSL makeFoliageMaterial
// + foliageWindPosition, rewritten as onBeforeCompile GLSL for three.js r171 WebGL.
//
// GEOMETRY CONTRACT (from leafCards.ts):
//   InstancedBufferAttribute aWindVec   (vec3)  — heading × weight, instance-local
//   InstancedBufferAttribute aAnchorPos (vec3)  — anchor in tree space (sway phase)
//   InstancedBufferAttribute aThickness (float) — per-instance 0.4..1
//   InstancedBufferAttribute instanceColor (vec3) — tint color (via setColorAt)

import * as THREE from 'three/webgpu'
import type { WindUniforms } from './windUniforms'
import { SWAY_GLSL } from './windUniforms'

export interface FoliageShaderOptions {
  wind: WindUniforms
  /** canopy bottom in WORLD space (per-tree, updated on rebuild) */
  canopyBottom?: THREE.Vector3
  /** sun direction in world space, normalized */
  sunDirection?: THREE.Vector3
  /** SSS transmitted color (linear). Peach default = warm pink */
  transmitColor?: THREE.Color
  /** translucency texture (r channel = transmittance) */
  translucencyMap?: THREE.Texture | null
  /** normal map texture (petal relief) */
  normalMapTex?: THREE.Texture | null
}

export interface FoliageMaterial {
  material: THREE.MeshStandardMaterial
  /** call this each frame to advance wind + sun */
  update: (elapsed: number, sunDirection: THREE.Vector3) => void
  /** call on rebuild when the tree moves the canopy */
  setCanopyBottom: (worldBottom: THREE.Vector3) => void
}

export function createFoliageMaterial(
  base: THREE.MeshStandardMaterial,
  opts: FoliageShaderOptions,
): FoliageMaterial {
  const mat = base.clone()
  // vertexColors enables reading instanceColor into vColor in the standard
  // pipeline, giving per-petal pink/white tint with no custom shader math.
  mat.vertexColors = true
  if (opts.normalMapTex) mat.normalMap = opts.normalMapTex

  // Held on the closure so we can mutate them per frame / per rebuild.
  const uCanopyBottom = { value: (opts.canopyBottom ?? new THREE.Vector3()).clone() }
  const uSunDirection = {
    value: (opts.sunDirection ?? new THREE.Vector3(0.5, 0.7, 0.5).normalize()).clone(),
  }
  const uTransmitColor = {
    value: (opts.transmitColor ?? new THREE.Color(0.42, 0.62, 0.24)).clone(),
  }

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uWindStrength: opts.wind.uWindStrength,
      uWindSpeed: opts.wind.uWindSpeed,
      uTime: opts.wind.uTime,
      uWindDir: opts.wind.uWindDir,
      uCanopyBottom,
      uSunDirection,
      uTransmitColor,
      uTranslucencyMap: { value: opts.translucencyMap ?? null },
    })

    // ── vertex shader ──────────────────────────────────────────────────────
    // One #include <common> replacement — uniforms, varyings, attributes, sway fn.
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      /* glsl */ `
        #include <common>
        uniform float uWindStrength;
        uniform float uWindSpeed;
        uniform float uTime;
        uniform vec3 uWindDir;
        uniform vec3 uCanopyBottom;
        attribute vec3 aWindVec;
        attribute vec3 aAnchorPos;
        attribute float aThickness;
        varying vec3 vFoliageWorldPos;
        varying float vFoliageThickness;
        ${SWAY_GLSL}
      `,
    )

    // Wind displacement + write varyings.
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      /* glsl */ `
        vec3 transformed = vec3(position);
        // aWindVec carries heading × weight, pre-baked into instance-local
        // frame (see leafCards.ts). Sway phase from modelMatrix·aAnchorPos so
        // every leaf takes its own world phase (NOT the mesh origin).
        vec3 anchorWorld = (modelMatrix * vec4(aAnchorPos, 1.0)).xyz;
        float baseSway = windSwayAt(anchorWorld) * uWindStrength * 0.35;
        transformed += aWindVec * baseSway;
        // Per-instance flutter, scales by leaf-local height (zero at anchor).
        float local = max(0.0, position.y);
        float flutterT = uTime * uWindSpeed * 5.2 + aThickness * 37.7;
        vec3 flutter = vec3(
          sin(flutterT),
          sin(flutterT * 1.31) * 0.6,
          sin(flutterT * 0.77)
        ) * uWindStrength * 0.05 * aThickness * local;
        transformed += flutter;
        vFoliageWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vFoliageThickness = aThickness;
      `,
    )

    // Dome-normal: REPLACE the geometric normal with a world-space dome vector.
    // Run in <beginnormal_vertex> so downstream chunks consume the dome value.
    shader.vertexShader = shader.vertexShader.replace(
      '#include <beginnormal_vertex>',
      /* glsl */ `
        // World position of THIS vertex. instanceMatrix applies downstream,
        // but the dome is a canopy-wide gradient so mesh-origin-relative is
        // fine for the gradient direction.
        vec3 vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        // Dome vector from canopy bottom, up-biased so no normal points down.
        vec3 domeWorld = normalize(vWorldPos - uCanopyBottom) + vec3(0.0, 0.45, 0.0);
        // World → view space (immune to instance spin).
        vec3 objectNormal = normalize((viewMatrix * vec4(domeWorld, 0.0)).xyz);
        vec3 transformedNormal = objectNormal;
        // vNormal is declared by defaultnormal_vertex; assign via the standard
        // chunk so normalMatrix + morph work downstream.
        vec3 normal = transformedNormal;
      `,
    )

    // ── fragment shader ────────────────────────────────────────────────────
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      /* glsl */ `
        #include <common>
        uniform vec3 uSunDirection;
        uniform vec3 uTransmitColor;
        uniform sampler2D uTranslucencyMap;
        varying vec3 vFoliageWorldPos;
        varying float vFoliageThickness;
      `,
    )

    // SSS back-translucency: add a wrap-diffuse term at the END of the lighting
    // pass. Independent of the PBR RE_Direct pipeline, so it survives any light
    // count and shadow/normal overrides.
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_end>',
      /* glsl */ `
        #include <lights_fragment_end>
        // Barré-Brisebois back-translucency.
        float transmit = texture2D(uTranslucencyMap, vUv).r;
        vec3 N = normalize(vNormal);
        vec3 V = normalize(cameraPosition - vFoliageWorldPos);
        vec3 L = normalize(uSunDirection);
        // N·(-L) is positive when the sun is BEHIND the card. The +V term
        // biases the glow toward the view-facing rim (light leaks around the
        // petal edge as you look through it).
        float backFace = max(0.0, dot(-L, N + V * 0.3));
        float wrap = pow(backFace, 6.0) * 3.0; // thicknessScale
        vec3 sss = transmit * vFoliageThickness * uTransmitColor * wrap;
        reflectedLight.directDiffuse += sss;
      `,
    )
  }

  mat.userData.isFoliageShader = true
  mat.customProgramCacheKey = () => 'seedthree-foliage-v1'

  const update = (elapsed: number, sunDirection: THREE.Vector3) => {
    opts.wind.uTime.value = elapsed
    uSunDirection.value.copy(sunDirection).normalize()
  }
  const setCanopyBottom = (worldBottom: THREE.Vector3) => {
    uCanopyBottom.value.copy(worldBottom)
  }

  return { material: mat, update, setCanopyBottom }
}
