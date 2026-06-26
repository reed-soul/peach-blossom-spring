// 浏览器原生中文语音旁白。不支持时静默降级。

let cachedVoice: SpeechSynthesisVoice | null | undefined
let enabled = true
const rate = 0.92 // 略慢，便于课堂跟读
const pitch = 1.0

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
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function setNarrationEnabled(on: boolean) {
  enabled = on
  if (!on) cancelNarration()
}

export function getNarrationEnabled(): boolean {
  return enabled
}

export function speak(text: string) {
  if (!enabled) return
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  try {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'zh-CN'
    u.rate = rate
    u.pitch = pitch
    const v = pickVoice()
    if (v) u.voice = v
    window.speechSynthesis.speak(u)
  } catch {
    /* 静默降级 */
  }
}

export function cancelNarration() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel()
    } catch {}
  }
}

// 预加载语音列表（某些浏览器异步加载 voices）
export function primeVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.getVoices()
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = undefined
    pickVoice()
  }
}
