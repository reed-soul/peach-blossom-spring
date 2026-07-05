import * as THREE from 'three/webgpu'

// 真实 PBR 贴图加载（从 public/textures/ 加载 threejs 官方示例贴图）
// 替代程序化顶点色，让场景有真实纹理细节
const BASE = `${import.meta.env.BASE_URL}textures/`

const cache: Record<string, THREE.Texture> = {}

function load(path: string, repeat: [number, number] = [1, 1]): THREE.Texture {
  const key = `${path}:${repeat.join(',')}`
  if (cache[key]) return cache[key]
  const tex = new THREE.TextureLoader().load(BASE + path)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(repeat[0], repeat[1])
  // 贴图颜色空间：diffuse/map 用 sRGB，normal/roughness 用线性（无颜色）
  if (path.includes('diff') || path.includes('color')) {
    tex.colorSpace = THREE.SRGBColorSpace
  }
  tex.anisotropy = 8
  cache[key] = tex
  return tex
}

export const PbrTextures = {
  // 草地（地形主体）
  grass: (repeat: [number, number] = [40, 40]) => load('grass_diff.jpg', repeat),
  // 木纹（房屋木构、船、栈道）
  wood: (repeat: [number, number] = [2, 2]) => load('wood_diff.jpg', repeat),
  woodRough: (repeat: [number, number] = [2, 2]) => load('wood_rough.jpg', repeat),
  // 砖墙（房屋墙体、城墙）
  brick: (repeat: [number, number] = [2, 2]) => load('brick_diff.jpg', repeat),
  // 水面法线（溪流波纹）
  waterNormal: (repeat: [number, number] = [4, 4]) => load('water_normal.jpg', repeat),
}
