import { useEffect, useMemo, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import {
  EffectComposer,
  Bloom,
  Vignette,
  HueSaturation,
  BrightnessContrast,
} from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode, KernelSize } from 'postprocessing'
import * as THREE from 'three'

// 每幕的后处理参数预设
interface FxPreset {
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
const PRESETS: FxPreset[] = [
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

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export interface PostFXProps {
  actIndex: number
}

export function PostFX({ actIndex }: PostFXProps) {
  // 当前生效参数（跨帧平滑过渡到目标，避免硬切）
  const current = useRef({ ...PRESETS[0] })
  const target = PRESETS[Math.min(actIndex, PRESETS.length - 1)]
  const { gl } = useThree()

  // ACES 色调映射 + sRGB 输出（电影感调色基础）
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping
    gl.toneMappingExposure = 1.05
  }, [gl])

  // 每帧把 current 平滑推向 target
  useFrame(() => {
    const c = current.current
    c.bloomIntensity = lerp(c.bloomIntensity, target.bloomIntensity, 0.03)
    c.bloomThreshold = lerp(c.bloomThreshold, target.bloomThreshold, 0.03)
    c.saturation = lerp(c.saturation, target.saturation, 0.03)
    c.brightness = lerp(c.brightness, target.brightness, 0.03)
    c.contrast = lerp(c.contrast, target.contrast, 0.03)
    c.vignetteDark = lerp(c.vignetteDark, target.vignetteDark, 0.03)
  })

  // effect 实例的 ref，用于每帧直接改 uniform（props 不会因 ref 变化重渲染）
  const bloomRef = useRef<any>(null)
  const hueRef = useRef<any>(null)
  const brightRef = useRef<any>(null)
  const vignetteRef = useRef<any>(null)

  useFrame(() => {
    const c = current.current
    // postprocessing effect 的参数在 .uniforms 或直接属性上
    if (bloomRef.current) {
      bloomRef.current.intensity = c.bloomIntensity
      if (bloomRef.current.luminancePass) bloomRef.current.luminancePass.threshold = c.bloomThreshold
    }
    if (hueRef.current?.uniforms?.saturation) hueRef.current.uniforms.saturation.value = c.saturation
    if (brightRef.current) {
      if (brightRef.current.uniforms?.brightness) brightRef.current.uniforms.brightness.value = c.brightness
      if (brightRef.current.uniforms?.contrast) brightRef.current.uniforms.contrast.value = c.contrast
    }
    if (vignetteRef.current?.uniforms?.darkness) vignetteRef.current.uniforms.darkness.value = c.vignetteDark
  })

  return (
    <EffectComposer multisampling={4}>
      <Bloom
        ref={bloomRef}
        intensity={current.current.bloomIntensity}
        luminanceThreshold={current.current.bloomThreshold}
        luminanceSmoothing={0.4}
        mipmapBlur
        kernelSize={KernelSize.LARGE}
      />
      <HueSaturation
        ref={hueRef}
        saturation={current.current.saturation}
        blendFunction={BlendFunction.NORMAL}
      />
      <BrightnessContrast
        ref={brightRef}
        brightness={current.current.brightness}
        contrast={current.current.contrast}
      />
      <Vignette
        ref={vignetteRef}
        offset={0.3}
        darkness={current.current.vignetteDark}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  )
}
