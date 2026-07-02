import { useCallback, useRef, useEffect } from 'react'

// Singleton audio manager —— 多层环境音 + 一次性事件音 + ducking
let ctx: AudioContext | null = null
let masterGain: GainNode | null = null
const buffers: Record<string, AudioBuffer> = {}
const activeSources: Record<string, AudioBufferSourceNode> = {}
const layerGains: Record<string, GainNode> = {} // 每层独立 gain，支持淡入淡出
const BASE_MASTER = 0.5

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext()
    masterGain = ctx.createGain()
    masterGain.gain.value = BASE_MASTER
    masterGain.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// ───────── 程序化音效生成 ─────────

function generateBirdSong(ctx: AudioContext, duration: number): AudioBuffer {
  const sr = ctx.sampleRate
  const len = sr * duration
  const buf = ctx.createBuffer(1, len, sr)
  const data = buf.getChannelData(0)
  let t = 0
  while (t < len) {
    const chirpLen = (0.03 + Math.random() * 0.08) * sr
    const freq = 2000 + Math.random() * 3000
    const chirpEnd = Math.min(t + chirpLen, len)
    for (let i = t; i < chirpEnd; i++) {
      const progress = (i - t) / chirpLen
      const env = Math.sin(progress * Math.PI) * 0.15
      data[i] = Math.sin((2 * Math.PI * freq * (i - t)) / sr) * env
    }
    t += chirpLen + (0.1 + Math.random() * 0.5) * sr
  }
  return buf
}

function generateWaterStream(ctx: AudioContext, duration: number): AudioBuffer {
  const sr = ctx.sampleRate
  const len = sr * duration
  const buf = ctx.createBuffer(1, len, sr)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) {
    const t = i / sr
    let sample = 0
    sample += Math.sin(2 * Math.PI * 200 * t + Math.sin(2 * Math.PI * 0.3 * t) * 3) * 0.1
    sample += Math.sin(2 * Math.PI * 450 * t + Math.sin(2 * Math.PI * 0.7 * t) * 2) * 0.05
    sample += (Math.random() * 2 - 1) * 0.02
    sample *= 0.7 + 0.3 * Math.sin(2 * Math.PI * 0.1 * t)
    data[i] = sample
  }
  return buf
}

function generateWind(ctx: AudioContext, duration: number): AudioBuffer {
  const sr = ctx.sampleRate
  const len = sr * duration
  const buf = ctx.createBuffer(1, len, sr)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) {
    const t = i / sr
    let sample = 0
    sample += Math.sin(2 * Math.PI * 100 * t + Math.sin(0.5 * t) * 4) * 0.05
    sample += Math.sin(2 * Math.PI * 250 * t + Math.sin(0.3 * t) * 3) * 0.03
    sample += (Math.random() * 2 - 1) * 0.015
    sample *= 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.05 * t)
    data[i] = sample
  }
  return buf
}

function generateGuqin(ctx: AudioContext, duration: number): AudioBuffer {
  const sr = ctx.sampleRate
  const len = sr * duration
  const buf = ctx.createBuffer(2, len, sr)
  const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25]
  for (const ch of [buf.getChannelData(0), buf.getChannelData(1)]) {
    let t = 0
    while (t < len) {
      const noteFreq = scale[Math.floor(Math.random() * scale.length)]
      const noteLen = (0.8 + Math.random() * 2.0) * sr
      const noteEnd = Math.min(t + noteLen, len)
      for (let i = t; i < noteEnd; i++) {
        const progress = (i - t) / noteLen
        const env = Math.exp(-progress * 3) * 0.2
        const pluck = i - t
        const sample =
          Math.sin((2 * Math.PI * noteFreq * pluck) / sr) * env +
          (Math.sin((2 * Math.PI * noteFreq * 2 * pluck) / sr) * env * 0.3) +
          (Math.sin((2 * Math.PI * noteFreq * 3 * pluck) / sr) * env * 0.1)
        ch[i] = Math.max(-1, Math.min(1, sample))
      }
      t += noteLen + (0.5 + Math.random() * 1.5) * sr
    }
  }
  return buf
}

function generateFootstep(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate
  const len = sr * 0.15
  const buf = ctx.createBuffer(1, len, sr)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) {
    const t = i / sr
    const env = Math.exp(-t * 30)
    data[i] = ((Math.random() * 2 - 1) * 0.3 + Math.sin(2 * Math.PI * 80 * t) * 0.2) * env
  }
  return buf
}

// 新增：风铃（高频金属共振，多谐波 + 快衰减）
function generateChime(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate
  const len = sr * 2.5
  const buf = ctx.createBuffer(2, len, sr)
  // 五声音阶高频，金属性共振
  const partials = [
    { f: 1318.51, a: 0.5 },
    { f: 1975.53, a: 0.3 },
    { f: 2637.02, a: 0.18 },
    { f: 3951.07, a: 0.1 },
  ]
  for (const ch of [buf.getChannelData(0), buf.getChannelData(1)]) {
    for (let i = 0; i < len; i++) {
      const t = i / sr
      const env = Math.exp(-t * 2.2)
      let s = 0
      for (const p of partials) s += Math.sin(2 * Math.PI * p.f * t) * p.a
      ch[i] = s * env * 0.18
    }
  }
  return buf
}

// 新增：锣（低频长尾 + 谐波 + 轻微拍频）
function generateGong(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate
  const len = sr * 4.5
  const buf = ctx.createBuffer(2, len, sr)
  const partials = [
    { f: 110, a: 0.5 },
    { f: 165, a: 0.32 },
    { f: 220, a: 0.22 },
    { f: 330, a: 0.14 },
    { f: 495, a: 0.08 },
  ]
  for (let c = 0; c < 2; c++) {
    const ch = buf.getChannelData(c)
    const detune = c === 0 ? 1.0 : 1.003 // 微拍频
    for (let i = 0; i < len; i++) {
      const t = i / sr
      const env = Math.exp(-t * 1.1)
      let s = 0
      for (const p of partials) s += Math.sin(2 * Math.PI * p.f * detune * t)
      // 起音瞬态
      const attack = i < sr * 0.01 ? (i / (sr * 0.01)) * 0.3 : 0
      ch[i] = (s * env * 0.16) + attack * (Math.random() * 2 - 1) * 0.2
    }
  }
  return buf
}

async function ensureBuffers() {
  const c = getCtx()
  if (buffers.birds) return
  buffers.birds = generateBirdSong(c, 8)
  buffers.water = generateWaterStream(c, 10)
  buffers.wind = generateWind(c, 12)
  buffers.guqin = generateGuqin(c, 30)
  buffers.footstep = generateFootstep(c)
  buffers.chime = generateChime(c)
  buffers.gong = generateGong(c)
}

// ───────── 多层播放接口（电影模式用） ─────────

function playLayer(name: string, target: number, fade = 0.8) {
  const c = getCtx()
  const buf = buffers[name]
  if (!buf || !masterGain) return
  // 已在播则只调音量
  if (activeSources[name]) {
    const g = layerGains[name]
    if (g) {
      g.gain.cancelScheduledValues(c.currentTime)
      g.gain.linearRampToValueAtTime(target, c.currentTime + fade)
    }
    return
  }
  const source = c.createBufferSource()
  source.buffer = buf
  source.loop = true
  const gain = c.createGain()
  gain.gain.value = 0
  source.connect(gain)
  gain.connect(masterGain)
  gain.gain.linearRampToValueAtTime(target, c.currentTime + fade)
  source.start()
  activeSources[name] = source
  layerGains[name] = gain
}

function stopLayer(name: string, fade = 0.8) {
  const c = getCtx()
  const s = activeSources[name]
  const g = layerGains[name]
  if (g) {
    g.gain.cancelScheduledValues(c.currentTime)
    g.gain.linearRampToValueAtTime(0, c.currentTime + fade)
  }
  if (s) {
    setTimeout(() => {
      try {
        s.stop()
      } catch {}
      delete activeSources[name]
    }, fade * 1000 + 50)
  }
}

function playOneShot(name: string, volume = 0.3) {
  const c = getCtx()
  const buf = buffers[name]
  if (!buf || !masterGain) return
  const source = c.createBufferSource()
  source.buffer = buf
  source.loop = false
  const gain = c.createGain()
  gain.gain.value = volume
  source.connect(gain)
  gain.connect(masterGain)
  source.start()
}

// ducking：旁白时压低总音量
function duck(amount = 0.2, duration = 0.3) {
  const c = getCtx()
  if (!masterGain) return
  masterGain.gain.cancelScheduledValues(c.currentTime)
  masterGain.gain.setValueAtTime(masterGain.gain.value, c.currentTime)
  masterGain.gain.linearRampToValueAtTime(amount, c.currentTime + duration)
}

function unduck(duration = 0.4) {
  const c = getCtx()
  if (!masterGain) return
  masterGain.gain.cancelScheduledValues(c.currentTime)
  masterGain.gain.setValueAtTime(masterGain.gain.value, c.currentTime)
  masterGain.gain.linearRampToValueAtTime(BASE_MASTER, c.currentTime + duration)
}

// ───────── 向后兼容的旧接口（交互探索模式仍用） ─────────

function playLoop(name: string, volume: number, loop = true) {
  if (activeSources[name]) return
  const c = getCtx()
  const buf = buffers[name]
  if (!buf || !masterGain) return
  const source = c.createBufferSource()
  source.buffer = buf
  source.loop = loop
  const gain = c.createGain()
  gain.gain.value = volume
  source.connect(gain)
  gain.connect(masterGain)
  source.start()
  activeSources[name] = source
  layerGains[name] = gain
}

function stopLoop(name: string) {
  const s = activeSources[name]
  if (s) {
    try {
      s.stop()
    } catch {}
    delete activeSources[name]
  }
}
import { playFootstep as playFootstepSound } from './footstep'

export function playFootstep() {
  playFootstepSound()
}

export function useAudio() {
  const initialized = useRef(false)

  const init = useCallback(async () => {
    if (initialized.current) return
    await ensureBuffers()
    initialized.current = true
  }, [])

  const startAmbient = useCallback(
    (scene: 'forest' | 'village') => {
      init()
      if (scene === 'forest') {
        playLoop('birds', 0.15)
        playLoop('water', 0.1)
        playLoop('wind', 0.08)
        stopLoop('guqin')
      } else {
        playLoop('guqin', 0.12)
        stopLoop('birds')
        stopLoop('water')
        stopLoop('wind')
      }
    },
    [init],
  )

  const stopAll = useCallback(() => {
    Object.keys(activeSources).forEach(stopLoop)
  }, [])

  const playStep = useCallback(() => {
    playFootstepSound()
  }, [])

  useEffect(() => {
    return () => {
      Object.keys(activeSources).forEach(stopLoop)
    }
  }, [])

  return {
    startAmbient,
    stopAll,
    playStep,
    // 新增多层/事件/ducking 接口（电影模式用）
    playLayer,
    stopLayer,
    playOneShot,
    duck,
    unduck,
  }
}
