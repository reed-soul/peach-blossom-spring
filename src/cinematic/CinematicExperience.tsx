import { useRef, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ACTS } from './script'
import { useDirector } from './useDirector'
import { Director } from './Director'
import { Actor } from './Actor'
import { CinematicCamera } from './CinematicCamera'
import { CinematicWorld } from './world/CinematicWorld'
import { CaptionBar } from './CaptionBar'
import { PostFX } from './PostFX'
import { createRenderer } from '../engine/createRenderer'
import {
  speak as narratorSpeak,
  cancelNarration,
  isNarrationSupported,
  setNarrationEnabled,
  getNarrationEnabled,
  primeVoices,
  setDuckHooks,
  setAudioPlayer,
} from './Narrator'
import { useAudio } from '../engine/AudioManager'
import type { DirectorState, ActorAction } from './types'

// Canvas 内：运行 Director、驱动 Actor 与相机，并把触发器回传外层
function DirectorRunner({
  onState,
}: {
  onState: (s: DirectorState) => void
}) {
  const dir = useDirector(ACTS)
  const posRef = useRef<[number, number, number]>([0, 0, 2])
  const facingRef = useRef<number>(Math.PI)
  const actionRef = useRef<ActorAction>('row')
  const audio = useAudio()

  // 暴露 restart 给外层（通过 ref 桥）
  const dirRef = useRef(dir)
  dirRef.current = dir
  const audioRef0 = useRef(audio)
  audioRef0.current = audio
  useEffect(() => {
    ;(window as any).__cinematicRestart = () => dirRef.current.restart()
    // 注入 ducking 钩子：旁白开始压低环境音、结束恢复
    setDuckHooks(
      () => audioRef0.current.duck(0.18, 0.3),
      () => audioRef0.current.unduck(0.5),
    )
    // 注入预录音频播放器（Narrator 优先用 mp3，降级 Web Speech）
    setAudioPlayer({
      playNarration: (id, vol, hooks) => audioRef0.current.playNarration(id, vol, hooks),
      stopNarration: () => audioRef0.current.stopNarration(),
      hasNarrationLoaded: (id) => audioRef0.current.hasNarrationLoaded(id),
    })
    // 预加载全部 25 段旁白 mp3（异步，不阻塞渲染）
    for (let ai = 0; ai < ACTS.length; ai++) {
      for (let bi = 0; bi < ACTS[ai].beats.length; bi++) {
        if (!ACTS[ai].beats[bi].narration) continue
        const id = `${ai + 1}-${bi + 1}`
        audioRef0.current.loadNarration(id, `${import.meta.env.BASE_URL}narration/${id}.mp3`)
      }
    }
    return () => {
      delete (window as any).__cinematicRestart
      setDuckHooks(() => {}, () => {})
      setAudioPlayer(null)
    }
  }, [])

  // 进入后自动开始（只在 mount 时调一次；不能用 dir 做依赖，
  // 因为 useDirector 每次渲染返回新对象，会导致 600ms 定时器反复重置 → startTime 永远停在近 0 → 时间线卡死）
  useEffect(() => {
    primeVoices()
    const t = setTimeout(() => dirRef.current.start(), 600)
    return () => clearTimeout(t)
  }, [])

  // useDirector 已在 useFrame 里推进 stateRef；这里每帧把状态下发到 refs
  useFrame(() => {
    const s = dir.stateRef.current
    posRef.current = s.actor.pos
    facingRef.current = s.actor.facing
    actionRef.current = s.actor.action
  })

  // RAF 把状态 + 触发器透传给 Canvas 外的 UI（独立于 R3F 帧循环）
  // 依赖只用稳定引用，避免 dir/audio 每次渲染新对象导致 RAF 反复重建
  const lastBeat = useRef<{ a: number; b: number }>({ a: -1, b: -1 })
  const onStateRef = useRef(onState)
  onStateRef.current = onState
  const audioRef = useRef(audio)
  audioRef.current = audio
  useEffect(() => {
    let raf = 0
    const loop = () => {
      const s = dirRef.current.stateRef.current
      if (s.actIndex !== lastBeat.current.a || s.beatIndex !== lastBeat.current.b) {
        lastBeat.current = { a: s.actIndex, b: s.beatIndex }
        const a = audioRef.current
        if (s.narrationTrigger) {
          // narrationId 约定：<actIndex+1>-<beatIndex+1>，对应 public/narration/<id>.mp3
          const narrationId = `${s.actIndex + 1}-${s.beatIndex + 1}`
          narratorSpeak(narrationId, s.narrationTrigger)
        }
        // 幕首拍：切整个环境层组合
        if (s.beatIndex === 0) {
          if (s.actIndex <= 1) {
            // 溪流/桃林：水+鸟+风+轻古琴
            a.playLayer('water', 0.13)
            a.playLayer('birds', 0.11)
            a.playLayer('wind', 0.08)
            a.playLayer('guqin', 0.05)
          } else if (s.actIndex === 2) {
            // 洞内：压掉鸟水，留风，突出幽暗
            a.stopLayer('birds', 1.0)
            a.stopLayer('water', 1.0)
            a.playLayer('wind', 0.12)
            a.stopLayer('guqin', 1.0)
          } else {
            // 村庄：古琴主+远景鸟
            a.playLayer('guqin', 0.14)
            a.playLayer('birds', 0.05)
            a.stopLayer('water', 1.2)
            a.stopLayer('wind', 1.2)
          }
        }
        // 事件音（任意 beat 都可触发）
        if (s.sfxTrigger === 'chime') a.playOneShot('chime', 0.3)
        else if (s.sfxTrigger === 'gong') a.playOneShot('gong', 0.35)
        else if (s.sfxTrigger === 'water') a.playLayer('water', 0.15)
        else if (s.sfxTrigger === 'birds') a.playLayer('birds', 0.13)
        else if (s.sfxTrigger === 'wind') a.playLayer('wind', 0.1)
      }
      onStateRef.current(s)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <>
      <Actor posRef={posRef} facingRef={facingRef} actionRef={actionRef} onStep={() => audioRef0.current.playStep()} />
      <CinematicCamera stateRef={dir.stateRef} hasStarted={dir.hasStarted} />
    </>
  )
}

export default function CinematicExperience() {
  const [uiState, setUiState] = useState<DirectorState>(() =>
    new Director(ACTS).sample(0),
  )
  const [narrationOn, setNarrationOn] = useState(isNarrationSupported())
  const [showRestart, setShowRestart] = useState(false)
  const finishedRef = useRef(false)
  const progressRef = useRef<HTMLDivElement>(null)

  const lastAct = ACTS.length - 1
  const lastBeat = ACTS[lastAct].beats.length - 1
  // 总拍数（用于进度条计算）
  const totalBeats = ACTS.reduce((n, a) => n + a.beats.length, 0)

  const onState = useCallback(
    (s: DirectorState) => {
      setUiState((prev) => {
        if (
          prev.caption === s.caption &&
          prev.title === s.title &&
          prev.actIndex === s.actIndex
        )
          return prev
        return s
      })
      // 进度条：直接操作 DOM，避免每帧 setState
      if (progressRef.current) {
        let done = 0
        for (let i = 0; i < s.actIndex; i++) done += ACTS[i].beats.length
        done += s.beatIndex + s.beatProgress
        const pct = Math.min(100, (done / totalBeats) * 100)
        progressRef.current.style.width = pct + '%'
      }
      if (
        !finishedRef.current &&
        s.actIndex === lastAct &&
        s.beatIndex === lastBeat &&
        s.beatProgress >= 0.98
      ) {
        finishedRef.current = true
        setShowRestart(true)
        cancelNarration()
      }
    },
    [lastAct, lastBeat, totalBeats],
  )

  const handleRestart = useCallback(() => {
    cancelNarration()
    finishedRef.current = false
    setShowRestart(false)
    ;(window as any).__cinematicRestart?.()
  }, [])

  const toggleNarration = useCallback(() => {
    const next = !getNarrationEnabled()
    setNarrationEnabled(next)
    setNarrationOn(next)
    if (!next) cancelNarration()
  }, [])

  const supported = isNarrationSupported()

  return (
    <div className="w-full h-full relative bg-black">
      <Canvas
        shadows="pcsoft"
        camera={{ position: [4, 4, 12], fov: 50, near: 0.1, far: 400 }}
        gl={createRenderer({ antialias: true, powerPreference: 'high-performance' })}
      >
        <DirectorRunner onState={onState} />
        <CinematicWorld />
        <PostFX actIndex={uiState.actIndex} />
      </Canvas>

      {/* 字幕 + 幕间标题 */}
      <CaptionBar caption={uiState.caption} title={uiState.title} />

      {/* 顶部标题 + 当前幕 */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center gap-1">
        <p
          className="text-xs opacity-50"
          style={{ color: '#e8dcc4', letterSpacing: '0.2em' }}
        >
          桃花源记 · 电影讲解
        </p>
        {uiState.title && (
          <p className="text-[10px] opacity-30" style={{ color: '#d4c5a9', letterSpacing: '0.15em' }}>
            {uiState.actIndex + 1} / {ACTS.length} · {ACTS[uiState.actIndex].title.replace(/^[^·]*·\s*/, '')}
          </p>
        )}
      </div>

      {/* 底部进度条 */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] z-30 pointer-events-none" style={{ background: 'rgba(212,197,169,0.12)' }}>
        <div
          ref={progressRef}
          data-progress="bar"
          className="h-full"
          style={{ width: '0%', background: 'linear-gradient(90deg, #a67c3a, #e8dcc4)', transition: 'width 0.1s linear' }}
        />
      </div>

      {/* 右上：语音开关 */}
      <button
        onClick={toggleNarration}
        className="absolute top-4 right-4 z-30 px-3 py-1.5 text-xs rounded-sm border cursor-pointer"
        style={{
          borderColor: 'rgba(212,197,169,0.4)',
          background: 'rgba(0,0,0,0.4)',
          color: '#e8dcc4',
          letterSpacing: '0.1em',
          backdropFilter: 'blur(4px)',
          opacity: supported ? 1 : 0.5,
        }}
      >
        {narrationOn ? '🔊 语音：开' : '🔇 语音：关'}
      </button>

      {/* 结束重播 */}
      {showRestart && (
        <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/65">
          <div className="text-center px-8">
            <p
              className="text-3xl mb-3"
              style={{ color: '#e8dcc4', letterSpacing: '0.3em' }}
            >
              — 终 —
            </p>
            <p
              className="text-base mb-8 opacity-70"
              style={{ color: '#d4c5a9', letterSpacing: '0.1em' }}
            >
              后遂无问津者。
            </p>
            <button
              onClick={handleRestart}
              className="px-8 py-3 rounded-sm border cursor-pointer transition-all hover:scale-105"
              style={{
                borderColor: '#a67c3a',
                color: '#e8dcc4',
                background: 'rgba(166,124,58,0.18)',
                letterSpacing: '0.2em',
              }}
            >
              重新播放
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
