// ⚠️ TEMPORARY STUB — WebGPU migration Phase A.
// The @react-three/postprocessing library is incompatible with WebGPURenderer,
// so the entire EffectComposer chain was removed. This stub preserves the
// PRESETS color-grading data (consumed by the Phase D TSL rewrite) and renders
// nothing for now — cinematic mode runs WITHOUT post-processing until Phase D
// replaces this with a native WebGPU PostProcessing + TSL implementation.
//
// Phase D TODO: rewrite using `PostProcessing` from 'three/webgpu' + TSL nodes
// (bloom/depthOfField/hueShift/vignette). See migration plan §D.

export interface FxPreset {
  bloomIntensity: number
  bloomThreshold: number
  saturation: number
  brightness: number
  contrast: number
  vignetteDark: number
  dofFocus: number
}

// 按幕调色：第三幕洞内偏冷压暗，第四幕豁然开朗提亮提饱；
// 第六幕起桃源暖意渐褪，第七幕去色压抑表现迷路，第八幕寂灭收尾——
// 形成"光一点点被抽走"的视觉悲剧弧线
export const PRESETS: FxPreset[] = [
  // 幕1 溪流：晨光柔和
  { bloomIntensity: 0.5, bloomThreshold: 0.85, saturation: 0.08, brightness: 0.02, contrast: 0.08, vignetteDark: 0.5, dofFocus: 0.02 },
  // 幕2 桃林：饱和粉嫩、轻微梦幻
  { bloomIntensity: 0.7, bloomThreshold: 0.8, saturation: 0.18, brightness: 0.03, contrast: 0.1, vignetteDark: 0.52, dofFocus: 0.02 },
  // 幕3 洞内：偏冷压暗，突出洞口光
  { bloomIntensity: 0.85, bloomThreshold: 0.7, saturation: -0.12, brightness: -0.08, contrast: 0.18, vignetteDark: 0.72, dofFocus: 0.015 },
  // 幕4 豁然开朗：爆亮提饱
  { bloomIntensity: 0.9, bloomThreshold: 0.75, saturation: 0.22, brightness: 0.08, contrast: 0.1, vignetteDark: 0.42, dofFocus: 0.02 },
  // 幕5 此中人语：暖意
  { bloomIntensity: 0.6, bloomThreshold: 0.82, saturation: 0.1, brightness: 0.03, contrast: 0.1, vignetteDark: 0.5, dofFocus: 0.02 },
  // 幕6 避秦：桃源暖意开始淡（微降饱和）
  { bloomIntensity: 0.55, bloomThreshold: 0.82, saturation: 0.05, brightness: 0.02, contrast: 0.12, vignetteDark: 0.54, dofFocus: 0.02 },
  // 幕7 既出遂迷：去色压抑（接近黑白，重压暗角）表现迷路
  { bloomIntensity: 0.4, bloomThreshold: 0.7, saturation: -0.25, brightness: -0.1, contrast: 0.22, vignetteDark: 0.78, dofFocus: 0.022 },
  // 幕8 无问津者：寂灭（强虚化 + 重暗角）
  { bloomIntensity: 0.3, bloomThreshold: 0.75, saturation: -0.4, brightness: -0.05, contrast: 0.18, vignetteDark: 0.85, dofFocus: 0.028 },
]

export interface PostFXProps {
  actIndex: number
}

// No-op until Phase D. ACES tone mapping + sRGB will be set on the renderer
// itself (gl factory) so the scene still renders with correct color, just
// without the per-act grade.
export function PostFX({ actIndex: _actIndex }: PostFXProps) {
  return null
}
