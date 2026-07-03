import * as THREE from 'three'

// 程序化生成的国风织锦暗纹纹理（云纹/回纹），用作袍/领/腰带的细节叠加
// 全部 canvas 绘制，零外部资源

let cloudPattern: THREE.CanvasTexture | null = null
let beltPattern: THREE.CanvasTexture | null = null
let fabricPattern: THREE.CanvasTexture | null = null

/** 织物纹理：浅色底 + 密织经纬线 + 微噪声，模拟布料表面质感
 *  作为 map 叠加到 toon 材质（浅色不破坏 tint，只加织物细节） */
export function getFabricPattern(): THREE.CanvasTexture {
  if (fabricPattern) return fabricPattern
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const ctx = c.getContext('2d')!
  // 浅色底（接近白，让 toon tint 主导）
  ctx.fillStyle = '#f5f0e8'
  ctx.fillRect(0, 0, 256, 256)
  // 密织经纬线（极细的横竖线，模拟织物编织）
  ctx.strokeStyle = 'rgba(180,170,150,0.25)'
  ctx.lineWidth = 0.5
  for (let i = 0; i < 256; i += 3) {
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke()
  }
  // 像素级噪声（模拟布料的不均匀质感）
  const img = ctx.getImageData(0, 0, 256, 256)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 20
    d[i] = Math.max(0, Math.min(255, d[i] + n))
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n))
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n))
  }
  ctx.putImageData(img, 0, 0)
  fabricPattern = new THREE.CanvasTexture(c)
  fabricPattern.wrapS = THREE.RepeatWrapping
  fabricPattern.wrapT = THREE.RepeatWrapping
  fabricPattern.repeat.set(6, 8)
  fabricPattern.colorSpace = THREE.SRGBColorSpace
  return fabricPattern
}

/** 云纹暗花：在浅色底上画低对比的如意云头，重复平铺 */
export function getCloudPattern(): THREE.CanvasTexture {
  if (cloudPattern) return cloudPattern
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, 256, 256)
  ctx.strokeStyle = 'rgba(255,255,255,0.10)'
  ctx.lineWidth = 2
  // 如意云头：螺旋卷曲
  const drawCloud = (cx: number, cy: number, s: number) => {
    ctx.beginPath()
    ctx.arc(cx - s * 0.5, cy, s * 0.5, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx + s * 0.5, cy, s * 0.5, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx, cy - s * 0.3, s * 0.4, 0, Math.PI * 2)
    ctx.stroke()
  }
  for (let y = 32; y < 256; y += 64) {
    for (let x = 32; x < 256; x += 64) {
      drawCloud(x, y, 16)
    }
  }
  cloudPattern = new THREE.CanvasTexture(c)
  cloudPattern.wrapS = THREE.RepeatWrapping
  cloudPattern.wrapT = THREE.RepeatWrapping
  cloudPattern.repeat.set(4, 6)
  return cloudPattern
}

/** 腰带回纹（雷纹）：连续的方形螺旋，国风织锦常见 */
export function getBeltPattern(): THREE.CanvasTexture {
  if (beltPattern) return beltPattern
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 64
  const ctx = c.getContext('2d')!
  ctx.fillStyle = 'rgba(212,175,90,0.18)'
  // 回纹：方形螺旋
  for (let x = 0; x < 128; x += 32) {
    ctx.strokeStyle = 'rgba(212,175,90,0.25)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(x + 6, 8)
    ctx.lineTo(x + 26, 8)
    ctx.lineTo(x + 26, 56)
    ctx.lineTo(x + 6, 56)
    ctx.lineTo(x + 6, 20)
    ctx.lineTo(x + 18, 20)
    ctx.lineTo(x + 18, 44)
    ctx.lineTo(x + 12, 44)
    ctx.stroke()
  }
  beltPattern = new THREE.CanvasTexture(c)
  beltPattern.wrapS = THREE.RepeatWrapping
  beltPattern.wrapT = THREE.RepeatWrapping
  beltPattern.repeat.set(8, 1)
  return beltPattern
}
