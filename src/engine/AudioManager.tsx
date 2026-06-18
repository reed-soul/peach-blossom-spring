import { useCallback, useRef, useEffect } from 'react'

// Singleton audio manager
let ctx: AudioContext | null = null
let masterGain: GainNode | null = null
const buffers: Record<string, AudioBuffer> = {}
const activeSources: Record<string, AudioBufferSourceNode> = {}

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext()
    masterGain = ctx.createGain()
    masterGain.gain.value = 0.5
    masterGain.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// Procedural sound generation (no external files needed)
function generateBirdSong(ctx: AudioContext, duration: number): AudioBuffer {
  const sr = ctx.sampleRate
  const len = sr * duration
  const buf = ctx.createBuffer(1, len, sr)
  const data = buf.getChannelData(0)
  let t = 0
  while (t < len) {
    // Random chirp
    const chirpLen = (0.03 + Math.random() * 0.08) * sr
    const freq = 2000 + Math.random() * 3000
    const chirpEnd = Math.min(t + chirpLen, len)
    for (let i = t; i < chirpEnd; i++) {
      const progress = (i - t) / chirpLen
      const env = Math.sin(progress * Math.PI) * 0.15
      data[i] = Math.sin(2 * Math.PI * freq * (i - t) / sr) * env
    }
    t += chirpLen + (0.1 + Math.random() * 0.5) * sr // gap between chirps
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
    // Filtered noise for water
    let sample = 0
    sample += Math.sin(2 * Math.PI * 200 * t + Math.sin(2 * Math.PI * 0.3 * t) * 3) * 0.1
    sample += Math.sin(2 * Math.PI * 450 * t + Math.sin(2 * Math.PI * 0.7 * t) * 2) * 0.05
    sample += (Math.random() * 2 - 1) * 0.02 // noise
    // Slow amplitude modulation
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
  // Pentatonic scale: C D E G A (in Hz)
  const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25]
  let t = 0
  for (const ch of [buf.getChannelData(0), buf.getChannelData(1)]) {
    t = 0
    while (t < len) {
      const noteFreq = scale[Math.floor(Math.random() * scale.length)]
      const noteLen = (0.8 + Math.random() * 2.0) * sr
      const noteEnd = Math.min(t + noteLen, len)
      // Guqin pluck: sharp attack, long decay with harmonics
      for (let i = t; i < noteEnd; i++) {
        const progress = (i - t) / noteLen
        const env = Math.exp(-progress * 3) * 0.2
        const pluck = i - t
        const sample =
          Math.sin(2 * Math.PI * noteFreq * pluck / sr) * env +
          Math.sin(2 * Math.PI * noteFreq * 2 * pluck / sr) * env * 0.3 +
          Math.sin(2 * Math.PI * noteFreq * 3 * pluck / sr) * env * 0.1
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

async function ensureBuffers() {
  const c = getCtx()
  if (buffers.birds) return
  buffers.birds = generateBirdSong(c, 8)
  buffers.water = generateWaterStream(c, 10)
  buffers.wind = generateWind(c, 12)
  buffers.guqin = generateGuqin(c, 30)
  buffers.footstep = generateFootstep(c)
}

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
}

function stopLoop(name: string) {
  const s = activeSources[name]
  if (s) {
    try { s.stop() } catch {}
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

  const startAmbient = useCallback((scene: 'forest' | 'village') => {
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
  }, [init])

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

  return { startAmbient, stopAll, playStep }
}
