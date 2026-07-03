// 旁白：优先用预录音频（macOS say 生成的 mp3），降级到浏览器 Web Speech。

let cachedVoice: SpeechSynthesisVoice | null | undefined
let enabled = true
const rate = 0.92
const pitch = 1.0

// ducking 钩子
let onSpeakStart: (() => void) | null = null
let onSpeakEnd: (() => void) | null = null

// 预录音频播放器（由 CinematicExperience 注入 AudioManager 的接口）
interface AudioPlayer {
  playNarration: (id: string, volume: number, hooks: { onStart?: () => void; onEnd?: () => void }) => boolean
  stopNarration: () => void
  hasNarrationLoaded: (id: string) => boolean
}
let audioPlayer: AudioPlayer | null = null

export function setAudioPlayer(player: AudioPlayer | null) {
  audioPlayer = player
}

export function setDuckHooks(start: () => void, end: () => void) {
  onSpeakStart = start
  onSpeakEnd = end
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  if (cachedVoice !== undefined) return cachedVoice
  const voices = window.speechSynthesis.getVoices()
  cachedVoice =
    voices.find((v) => v.lang === 'zh-CN') ??
    voices.find((v) => v.lang?.toLowerCase().startsWith('zh')) ??
    null
  return cachedVoice
}

export function isNarrationSupported(): boolean {
  // 预录音频可用 或 Web Speech 可用
  if (audioPlayer) return true
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function setNarrationEnabled(on: boolean) {
  enabled = on
  if (!on) cancelNarration()
}

export function getNarrationEnabled(): boolean {
  return enabled
}

/**
 * 播放旁白。优先用预录音频（id 对应 public/narration/<id>.mp3），
 * 音频未加载则降级到 Web Speech 朗读 text。
 */
export function speak(id: string, text: string) {
  if (!enabled) return
  // 优先预录音频
  if (audioPlayer && audioPlayer.hasNarrationLoaded(id)) {
    audioPlayer.playNarration(id, 0.6, {
      onStart: () => onSpeakStart?.(),
      onEnd: () => onSpeakEnd?.(),
    })
    return
  }
  // 降级：Web Speech
  speakWithWebSpeech(text)
}

function speakWithWebSpeech(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  try {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'zh-CN'
    u.rate = rate
    u.pitch = pitch
    const v = pickVoice()
    if (v) u.voice = v
    u.onstart = () => onSpeakStart?.()
    u.onend = () => onSpeakEnd?.()
    u.onerror = () => onSpeakEnd?.()
    window.speechSynthesis.speak(u)
  } catch {
    /* 静默降级 */
  }
}

export function cancelNarration() {
  if (audioPlayer) audioPlayer.stopNarration()
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel()
    } catch {}
  }
  onSpeakEnd?.()
}

// 预加载语音列表（Web Speech 降级用）
export function primeVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.getVoices()
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = undefined
    pickVoice()
  }
}
