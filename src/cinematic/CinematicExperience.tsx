import { useRef, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ACTS } from './script'
import { useDirector } from './useDirector'
import { Director } from './Director'
import { Actor } from './Actor'
import { CinematicCamera } from './CinematicCamera'
import { CinematicWorld } from './world/CinematicWorld'
import { CaptionBar } from './CaptionBar'
import {
  speak as narratorSpeak,
  cancelNarration,
  isNarrationSupported,
  setNarrationEnabled,
  getNarrationEnabled,
  primeVoices,
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
  useEffect(() => {
    ;(window as any).__cinematicRestart = () => dirRef.current.restart()
    return () => {
      delete (window as any).__cinematicRestart
    }
  }, [])

  // 进入后自动开始
  useEffect(() => {
    primeVoices()
    const t = setTimeout(() => dir.start(), 600)
    return () => clearTimeout(t)
  }, [dir])

  // useDirector 已在 useFrame 里推进 stateRef；这里每帧把状态下发到 refs
  useFrame(() => {
    const s = dir.stateRef.current
    posRef.current = s.actor.pos
    facingRef.current = s.actor.facing
    actionRef.current = s.actor.action
  })

  // RAF 把状态 + 触发器透传给 Canvas 外的 UI（独立于 R3F 帧循环）
  const lastBeat = useRef<{ a: number; b: number }>({ a: -1, b: -1 })
  useEffect(() => {
    let raf = 0
    const loop = () => {
      const s = dir.stateRef.current
      if (s.actIndex !== lastBeat.current.a || s.beatIndex !== lastBeat.current.b) {
        lastBeat.current = { a: s.actIndex, b: s.beatIndex }
        if (s.narrationTrigger) narratorSpeak(s.narrationTrigger)
        if (s.sfxTrigger) {
          if (s.sfxTrigger === 'village' || s.sfxTrigger === 'chime' || s.sfxTrigger === 'gong') {
            audio.startAmbient('village')
          } else {
            audio.startAmbient('forest')
          }
        }
      }
      onState(s)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [dir, onState, audio])

  return (
    <>
      <Actor posRef={posRef} facingRef={facingRef} actionRef={actionRef} />
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

  const lastAct = ACTS.length - 1
  const lastBeat = ACTS[lastAct].beats.length - 1

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
    [lastAct, lastBeat],
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
        shadows
        camera={{ position: [4, 4, 12], fov: 50, near: 0.1, far: 400 }}
        gl={{ antialias: true }}
      >
        <DirectorRunner onState={onState} />
        <CinematicWorld />
      </Canvas>

      {/* 字幕 + 幕间标题 */}
      <CaptionBar caption={uiState.caption} title={uiState.title} />

      {/* 顶部标题 */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <p
          className="text-xs opacity-50"
          style={{ color: '#e8dcc4', letterSpacing: '0.2em' }}
        >
          桃花源记 · 电影讲解
        </p>
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
