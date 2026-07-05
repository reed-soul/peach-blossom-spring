import * as THREE from 'three/webgpu'

/**
 * 给一个 meshToonMaterial 注入顶点级"风/飘动"动画。
 * 通过 onBeforeCompile 改写顶点着色器：
 * - 越靠近"末端"（沿 Y 轴某高度以上/以下，由参数控制）位移越大
 * - 用正弦+噪声做柔和飘动
 *
 * axis: 'y+' 表示末端在上方（长发上→下飘，末端在下，用 'y-'）
 *       'y-' 表示末端在下方（下摆、飘带，末端在下）
 * pivot: 位移基准点（约束在该处不动）
 * amount: 末端最大位移量
 * speed: 飘动速度
 * phase: 相位偏移（让不同部位不同步）
 */
export interface WindParams {
  axis: 'y+' | 'y-'
  pivot: number // 不动的那一端的世界 y（局部坐标）
  amount: number
  speed?: number
  phase?: number
  swayX?: number // 横向摆幅
  swayZ?: number
}

export function applyWind(material: THREE.MeshToonMaterial | THREE.MeshBasicMaterial, p: WindParams): typeof material {
  const speed = p.speed ?? 1.2
  const phase = p.phase ?? 0
  const swayX = p.swayX ?? 1.0
  const swayZ = p.swayZ ?? 0.4

  // 用于在 useFrame 中更新 uTime（onBeforeCompile 的 uniforms 不在 material.uniforms 上）
  const sharedUniforms = {
    uTime: { value: 0 },
    uPivot: { value: p.pivot },
    uAmount: { value: p.amount },
    uSpeed: { value: speed },
    uPhase: { value: phase },
    uSwayX: { value: swayX },
    uSwayZ: { value: swayZ },
    uDir: { value: p.axis === 'y+' ? 1 : -1 },
  }

  material.onBeforeCompile = (shader) => {
    // 让 shader 直接引用 sharedUniforms，这样外部更新 sharedUniforms.uTime 即生效
    Object.assign(shader.uniforms, sharedUniforms)

    // 在顶点着色器开头注入 uniform 与函数
    shader.vertexShader = `
      uniform float uTime;
      uniform float uPivot;
      uniform float uAmount;
      uniform float uSpeed;
      uniform float uPhase;
      uniform float uSwayX;
      uniform float uSwayZ;
      uniform float uDir;
      varying float vWindW;

      // 简易噪声
      float hash11(float p){ p=fract(p*0.1031); p*=p+33.33; p*=p+p; return fract(p); }

      vec3 applyWind(vec3 transformed){
        float dist = (transformed.y - uPivot) * uDir; // 末端为正
        if(dist > 0.0){
          float w = smoothstep(0.0, 1.0, dist); // 末端权重 0→1
          float t = uTime * uSpeed + uPhase;
          float n = hash11(floor(transformed.y * 4.0 + t * 0.5));
          float sway = sin(t + transformed.y * 1.5) * 0.5 + 0.5;
          float wob = sin(t * 1.7 + n * 6.28) * 0.5;
          float amp = (sway * 0.7 + wob * 0.3) * w * uAmount;
          transformed.x += amp * uSwayX;
          transformed.z += amp * uSwayZ * sin(t * 0.8);
          // 末端微微下垂（重力感）
          transformed.y -= w * uAmount * 0.15;
          vWindW = w;
        } else {
          vWindW = 0.0;
        }
        return transformed;
      }
    ` + shader.vertexShader

    // 在 #include <begin_vertex> 处把 transformed 过一遍风
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       transformed = applyWind(transformed);`,
    )
  }

  // 缓存 sharedUniforms 引用，外部更新其 uTime 即可
  ;(material as any).userData.windApplied = true
  ;(material as any).userData.windUniforms = sharedUniforms
  return material
}

/** 在 useFrame 中推进所有带风材质的 uTime */
export function tickWindMaterials(root: THREE.Object3D, elapsed: number) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    const mat = mesh.material as THREE.MeshToonMaterial | undefined
    if (mat && (mat as any).userData?.windApplied) {
      const shared = (mat as any).userData.windUniforms
      if (shared?.uTime) shared.uTime.value = elapsed
    }
  })
}
