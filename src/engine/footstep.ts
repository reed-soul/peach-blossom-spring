// Lightweight footstep playback — kept separate so PlayerBody does not pull the full audio module graph.

let ctx: AudioContext | null = null
let footstepBuffer: AudioBuffer | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function buildFootstepBuffer(c: AudioContext): AudioBuffer {
  const sr = c.sampleRate
  const len = sr * 0.15
  const buf = c.createBuffer(1, len, sr)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) {
    const t = i / sr
    const env = Math.exp(-t * 30)
    data[i] = ((Math.random() * 2 - 1) * 0.3 + Math.sin(2 * Math.PI * 80 * t) * 0.2) * env
  }
  return buf
}

export function playFootstep() {
  const c = getCtx()
  if (!footstepBuffer) footstepBuffer = buildFootstepBuffer(c)
  const gain = c.createGain()
  gain.gain.value = 0.12
  gain.connect(c.destination)
  const source = c.createBufferSource()
  source.buffer = footstepBuffer
  source.connect(gain)
  source.start()
}
