import * as THREE from 'three/webgpu'

let petalTexture: THREE.CanvasTexture | null = null
let grassTexture: THREE.CanvasTexture | null = null

/** 桃花花瓣 alpha 贴图：粉色水滴/心形，带透明通道 */
export function createPetalAlphaTexture(): THREE.CanvasTexture {
  if (petalTexture) return petalTexture

  const size = 128
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')!

  ctx.clearRect(0, 0, size, size)

  const cx = size / 2
  const cy = size * 0.52

  // 主瓣：椭圆 + 尖端（上窄下宽），白色 RGB + alpha 渐变供 instanceColor 着色
  const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, size * 0.42)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.55, 'rgba(255,255,255,0.95)')
  grad.addColorStop(1, 'rgba(255,255,255,0.65)')

  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.moveTo(cx, size * 0.06)
  ctx.bezierCurveTo(cx + size * 0.38, size * 0.18, cx + size * 0.42, size * 0.62, cx + size * 0.12, size * 0.88)
  ctx.quadraticCurveTo(cx, size * 0.96, cx - size * 0.12, size * 0.88)
  ctx.bezierCurveTo(cx - size * 0.42, size * 0.62, cx - size * 0.38, size * 0.18, cx, size * 0.06)
  ctx.closePath()
  ctx.fill()

  // 瓣脉：降低 alpha 而非染色，保留 instanceColor 色调
  ctx.globalCompositeOperation = 'destination-out'
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(cx, size * 0.1)
  ctx.quadraticCurveTo(cx + 2, size * 0.5, cx + 4, size * 0.82)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx, size * 0.1)
  ctx.quadraticCurveTo(cx - 2, size * 0.5, cx - 4, size * 0.82)
  ctx.stroke()
  ctx.globalCompositeOperation = 'source-over'

  petalTexture = new THREE.CanvasTexture(c)
  petalTexture.colorSpace = THREE.SRGBColorSpace
  petalTexture.needsUpdate = true
  return petalTexture
}

/** 草簇 alpha 贴图：多根草叶，用于 billboard 草地 */
export function createGrassAlphaTexture(): THREE.CanvasTexture {
  if (grassTexture) return grassTexture

  const w = 64
  const h = 128
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, w, h)

  const blades = [
    { x: 0.5, h: 1.0, w: 0.14, lean: 0 },
    { x: 0.32, h: 0.82, w: 0.11, lean: -0.12 },
    { x: 0.68, h: 0.78, w: 0.1, lean: 0.14 },
    { x: 0.22, h: 0.65, w: 0.09, lean: -0.08 },
    { x: 0.78, h: 0.7, w: 0.09, lean: 0.1 },
  ]

  for (const b of blades) {
    const bx = b.x * w
    const bh = b.h * h
    const bw = b.w * w
    const grad = ctx.createLinearGradient(bx, h, bx, h - bh)
    grad.addColorStop(0, 'rgba(255,255,255,0.95)')
    grad.addColorStop(0.6, 'rgba(255,255,255,0.85)')
    grad.addColorStop(1, 'rgba(255,255,255,0.2)')

    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(bx - bw * 0.5, h - 2)
    ctx.quadraticCurveTo(
      bx - bw * 0.3 + b.lean * w,
      h - bh * 0.5,
      bx + b.lean * w * 0.8,
      h - bh,
    )
    ctx.quadraticCurveTo(
      bx + bw * 0.3 + b.lean * w,
      h - bh * 0.5,
      bx + bw * 0.5,
      h - 2,
    )
    ctx.closePath()
    ctx.fill()
  }

  grassTexture = new THREE.CanvasTexture(c)
  grassTexture.colorSpace = THREE.SRGBColorSpace
  grassTexture.needsUpdate = true
  return grassTexture
}
