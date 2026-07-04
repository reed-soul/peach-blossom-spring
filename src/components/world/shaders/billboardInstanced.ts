import * as THREE from 'three'

/** Billboard instanced mesh — planes always face the camera, tinted by instanceColor */
export function createBillboardMaterial(
  map: THREE.Texture,
  options?: { alphaTest?: number; wind?: boolean },
): THREE.ShaderMaterial {
  const wind = options?.wind ?? false
  const alphaTest = options?.alphaTest ?? 0.15

  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: map },
      uTime: { value: 0 },
    },
    vertexShader: `
      attribute vec3 instanceColor;
      varying vec3 vColor;
      varying vec2 vUv;
      uniform float uTime;

      void main() {
        vColor = instanceColor;
        vUv = uv;

        vec4 worldCenter = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float sx = length(vec3(instanceMatrix[0].xyz));
        float sy = length(vec3(instanceMatrix[1].xyz));

        vec3 camPos = (inverse(viewMatrix) * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        // Cylindrical billboard：只绕 Y 轴跟随相机水平方向，up 固定向上
        // （spherical 全跟相机时俯视会变成一条线，cylindrical 俯视仍是竖立扁片）
        vec3 lookH = normalize(vec3(camPos.x - worldCenter.x, 0.0, camPos.z - worldCenter.z));
        vec3 up = vec3(0.0, 1.0, 0.0);
        vec3 right = normalize(cross(up, lookH));
        if (length(right) < 0.001) right = vec3(1.0, 0.0, 0.0);

        vec2 pos = position.xy;
        ${wind ? `
        float h = pos.y + 0.5;
        float phase = worldCenter.x * 0.4 + worldCenter.z * 0.3;
        float sway = sin(uTime * 1.8 + phase) * 0.14 * h * h;
        float flutter = cos(uTime * 2.4 + phase * 0.6) * 0.06 * h;
        pos.x += sway + flutter;
        pos.y += sin(uTime * 2.1 + phase * 1.1) * 0.04 * h * h;
        ` : ''}

        vec3 worldPos = worldCenter.xyz
          + right * pos.x * sx
          + up * pos.y * sy;

        gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      varying vec3 vColor;
      varying vec2 vUv;

      void main() {
        vec4 tex = texture2D(map, vUv);
        if (tex.a < ${alphaTest.toFixed(2)}) discard;
        gl_FragColor = vec4(vColor * tex.rgb, tex.a);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
}
