import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'
import type { ActorAction } from './types'
import type { ActorProps } from './Actor'
import { getTerrainHeight } from '../components/world/Terrain'

const MODEL_URL = `${import.meta.env.BASE_URL}models/fisherman.glb`

// Xbot.glb 动画名（小写）
const CLIP_FOR: Record<ActorAction, string> = {
  idle: 'idle',
  walk: 'walk',
  enter: 'walk',
  row: 'idle',
  sit: 'idle',
}

// ActorGLB：用 Xbot 人形骨架（CC0）+ 骨骼动画。
// Xbot 是清晰的真人形（有面部/四肢/步态），比程序化色块和 Soldier 都好。
export function ActorGLB({ posRef, facingRef, actionRef, onStep }: ActorProps) {
  const group = useRef<THREE.Group>(null)
  const { scene, animations } = useGLTF(MODEL_URL) as any
  const { actions, names } = useAnimations(animations, group)

  // 克隆场景避免污染缓存（多实例安全）
  const cloned = useMemo(() => scene.clone(true), [scene])

  // 遍历让所有 mesh 投射/接收阴影 + 增强环境反射（消除"漂浮+塑料感"）
  useEffect(() => {
    cloned.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
        if (o.material) {
          if (Array.isArray(o.material)) {
            o.material.forEach((m: any) => { if (m.envMapIntensity !== undefined) m.envMapIntensity = 1.2 })
          } else if (o.material.envMapIntensity !== undefined) {
            o.material.envMapIntensity = 1.2
          }
        }
      }
    })
  }, [cloned])

  // 当前播放的 clip，用于切换
  const currentClip = useRef<string | null>(null)
  const stepPhase = useRef(0)
  const lastStepSign = useRef(1)

  // 进入时播 idle
  useEffect(() => {
    const idle = actions['idle']
    if (idle) {
      idle.reset().fadeIn(0.3).play()
      currentClip.current = 'idle'
    }
    return () => {
      // 清理：停所有
      names.forEach((n: string) => actions[n]?.stop())
    }
  }, [actions, names])

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    const [x, , z] = posRef.current
    // y 跟随地形高度（修穿地），略抬高避免脚陷入地表
    const groundY = getTerrainHeight(x, z)
    g.position.set(x, groundY, z)

    // 朝向：Soldier 默认朝 +z，我们 facing=π 朝 -z，故加 Math.PI 对齐
    // 平滑跟随
    const targetY = facingRef.current + Math.PI
    let dy = targetY - g.rotation.y
    while (dy > Math.PI) dy -= Math.PI * 2
    while (dy < -Math.PI) dy += Math.PI * 2
    g.rotation.y += dy * 0.18

    // 动作切换
    const action = actionRef.current
    const wantClip = CLIP_FOR[action] || 'idle'
    if (currentClip.current !== wantClip && actions[wantClip]) {
      const prev = actions[currentClip.current!]
      const next = actions[wantClip]
      if (prev) prev.fadeOut(0.25)
      next.reset().setEffectiveWeight(1).fadeIn(0.25).play()
      currentClip.current = wantClip
    }

    // 脚步声：Walk 动画时按频率触发
    if ((action === 'walk' || action === 'enter') && onStep) {
      stepPhase.current += delta * 2.4 // 步频
      const sign = Math.sin(stepPhase.current) >= 0 ? 1 : -1
      if (sign !== lastStepSign.current) {
        lastStepSign.current = sign
        onStep()
      }
    }
  })

  return (
    <group ref={group} rotation={[0, Math.PI, 0]} scale={1.8}>
      <primitive object={cloned} />
    </group>
  )
}

// 预加载
useGLTF.preload(MODEL_URL)
