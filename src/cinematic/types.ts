export type Vec3 = [number, number, number]

export type ActorAction = 'idle' | 'walk' | 'row' | 'enter' | 'sit'

export type SfxName = 'birds' | 'water' | 'wind' | 'chime' | 'gong' | 'village'

export interface CameraKey {
  pos: Vec3
  lookAt: Vec3
  fov?: number
}

export interface ActorKey {
  pos: Vec3
  facing?: number // 弧度，绕 Y 轴
  action?: ActorAction
}

export interface Beat {
  at: number // 秒，相对所在 act 的起点
  duration: number // 秒
  camera: CameraKey
  camEnd?: CameraKey // beat 内相机推拉终点：rawT>0.2 后从 camera 缓慢 lerp 到 camEnd（dolly in）
  actor?: ActorKey
  caption?: string
  narration?: string
  sfx?: SfxName
  cut?: boolean // 硬切：snap 到目标不做 lerp（用于'豁然开朗'等戏剧性瞬间）
}

export interface Act {
  name: string
  title: string // 幕间大标题
  beats: Beat[]
}

// Director.sample() 的输出快照
export interface DirectorState {
  actIndex: number
  beatIndex: number
  beatProgress: number // 0..1 当前 beat 内进度
  camera: { pos: Vec3; lookAt: Vec3; fov: number }
  actor: { pos: Vec3; facing: number; action: ActorAction }
  caption: string | null
  narration: string | null
  narrationTrigger: string | null // 仅在 beat 切换瞬间非空
  sfxTrigger: SfxName | null // 仅在 beat 切换瞬间非空
  title: string | null // 仅在 act 首帧非空
}
