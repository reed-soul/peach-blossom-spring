import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three/webgpu'
import type { ActorAction } from './types'
import type { ActorProps } from './Actor'
import { getTerrainHeight } from '../components/world/Terrain'

// GLB 模型表（仅 ?glb=<name> 时启用，默认走程序化角色）
const MODELS: Record<string, string> = {
  soldier: `${import.meta.env.BASE_URL}models/npcs/soldier.glb`,
  readyplayer: `${import.meta.env.BASE_URL}models/npcs/readyplayer.glb`,
  michelle: `${import.meta.env.BASE_URL}models/npcs/michelle.glb`,
}

// 有骨骼动画时的 clip 映射（Xbot 等带动画模型用）
const CLIP_FOR: Record<ActorAction, string> = {
  idle: 'idle',
  walk: 'walk',
  enter: 'walk',
  row: 'idle',
  sit: 'idle',
}

export interface ActorGLBProps extends ActorProps {
  glbName: string
}

export function ActorGLB({ posRef, facingRef, actionRef, onStep, glbName }: ActorGLBProps) {
  const MODEL_URL = MODELS[glbName] || MODELS.soldier
  const group = useRef<THREE.Group>(null)
  const { scene, animations } = useGLTF(MODEL_URL) as any
  const { actions, names } = useAnimations(animations, group)

  // 不 clone（骨骼模型 clone 会断 skeleton；静态模型不需要 clone）
  const hasAnimations = animations && animations.length > 0

  // 遍历让所有 mesh 投射/接收阴影 + 增强 envMap
  useEffect(() => {
    scene.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
        if (o.material) {
          if (Array.isArray(o.material)) {
            o.material.forEach((m: any) => { if (m.envMapIntensity !== undefined) m.envMapIntensity = 1.0 })
          } else if (o.material.envMapIntensity !== undefined) {
            o.material.envMapIntensity = 1.0
          }
        }
      }
    })
  }, [scene])

  const currentClip = useRef<string | null>(null)
  const stepPhase = useRef(0)
  const lastStepSign = useRef(1)

  // 有动画时播 idle
  useEffect(() => {
    if (!hasAnimations) return
    const idle = actions['idle'] || actions[names[0]]
    if (idle) {
      idle.reset().fadeIn(0.3).play()
      currentClip.current = names[0]
    }
    return () => { names.forEach((n: string) => actions[n]?.stop()) }
  }, [actions, names, hasAnimations])

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    const [x, , z] = posRef.current
    // y 跟随地形高度
    const groundY = getTerrainHeight(x, z)
    g.position.set(x, groundY, z)

    // 朝向平滑跟随（meshy 模型朝向未知，加 Math.PI 对齐 facing=π）
    const targetY = facingRef.current + Math.PI
    let dy = targetY - g.rotation.y
    while (dy > Math.PI) dy -= Math.PI * 2
    while (dy < -Math.PI) dy += Math.PI * 2
    g.rotation.y += dy * 0.18

    // 动画切换（仅当模型有动画时）
    if (hasAnimations) {
      const action = actionRef.current
      const wantClip = CLIP_FOR[action] || 'idle'
      if (currentClip.current !== wantClip && actions[wantClip]) {
        const prev = actions[currentClip.current!]
        const next = actions[wantClip]
        if (prev) prev.fadeOut(0.25)
        next.reset().setEffectiveWeight(1).fadeIn(0.25).play()
        currentClip.current = wantClip
      }
      // 脚步声
      if ((action === 'walk' || action === 'enter') && onStep) {
        stepPhase.current += delta * 2.4
        const sign = Math.sin(stepPhase.current) >= 0 ? 1 : -1
        if (sign !== lastStepSign.current) { lastStepSign.current = sign; onStep() }
      }
    }
  })

  // scale 适配（不同模型大小不一，soldier 用 1.0，其余可调）
  const scale = glbName === 'soldier' ? 1.0 : 1.5
  return (
    <group ref={group} rotation={[0, Math.PI, 0]} scale={scale}>
      <primitive object={scene} />
    </group>
  )
}
