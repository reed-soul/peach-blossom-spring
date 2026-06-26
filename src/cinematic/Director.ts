import type {
  Act,
  DirectorState,
  Vec3,
  ActorAction,
} from './types'

const DEFAULT_FOV = 50
const DEFAULT_ACTOR_ACTION: ActorAction = 'idle'

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

// easeInOut，让镜头/角色运动更像电影
function ease(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

interface ActorState {
  pos: Vec3
  facing: number
  action: ActorAction
}

export class Director {
  private acts: Act[]
  private actStartTimes: number[]
  readonly totalDuration: number
  private lastElapsed = 0

  constructor(acts: Act[]) {
    if (acts.length === 0) throw new Error('Director: 至少需要一幕')
    for (const act of acts) this.validateAct(act)
    this.acts = acts
    this.totalDuration = acts.reduce((sum, a) => sum + this.actDuration(a), 0)
    this.actStartTimes = []
    let acc = 0
    for (const a of acts) {
      this.actStartTimes.push(acc)
      acc += this.actDuration(a)
    }
  }

  private actDuration(act: Act): number {
    return act.beats.reduce((s, b) => s + b.duration, 0)
  }

  private validateAct(act: Act) {
    let cursor = 0
    for (const b of act.beats) {
      if (b.duration <= 0) throw new Error(`Director: beat duration 必须 > 0`)
      if (Math.abs(b.at - cursor) > 1e-6) {
        throw new Error(
          `Director: beat at=${b.at} 与期望 ${cursor} 不一致（beats 必须连续无重叠）`,
        )
      }
      cursor = b.at + b.duration
    }
  }

  get isFinished(): boolean {
    return this.lastElapsed >= this.totalDuration
  }

  sample(elapsed: number): DirectorState {
    this.lastElapsed = elapsed
    if (elapsed >= this.totalDuration) {
      return this.sampleLast()
    }
    if (elapsed < 0) elapsed = 0

    // 定位 act
    let actIndex = 0
    for (let i = 0; i < this.acts.length; i++) {
      const start = this.actStartTimes[i]
      const end = start + this.actDuration(this.acts[i])
      if (elapsed >= start && elapsed < end) {
        actIndex = i
        break
      }
      if (i === this.acts.length - 1) actIndex = i
    }
    const act = this.acts[actIndex]
    const localTime = elapsed - this.actStartTimes[actIndex]

    // 定位 beat
    let beatIndex = 0
    let beatLocalStart = 0
    for (let i = 0; i < act.beats.length; i++) {
      const b = act.beats[i]
      if (localTime >= b.at && localTime < b.at + b.duration) {
        beatIndex = i
        beatLocalStart = b.at
        break
      }
      if (i === act.beats.length - 1) {
        beatIndex = i
        beatLocalStart = b.at
      }
    }

    return this.buildState(actIndex, beatIndex, localTime, beatLocalStart)
  }

  private sampleLast(): DirectorState {
    const actIndex = this.acts.length - 1
    const act = this.acts[actIndex]
    const beatIndex = act.beats.length - 1
    const beat = act.beats[beatIndex]
    const lastActor = this.resolveActor(actIndex, beatIndex)
    return {
      actIndex,
      beatIndex,
      beatProgress: 1,
      camera: {
        pos: beat.camera.pos,
        lookAt: beat.camera.lookAt,
        fov: beat.camera.fov ?? DEFAULT_FOV,
      },
      actor: lastActor,
      caption: beat.caption ?? null,
      narration: beat.narration ?? null,
      narrationTrigger: null,
      sfxTrigger: null,
      title: null,
    }
  }

  // 计算某 beat 的 actor（处理 actor 缺省时向前继承）
  private resolveActor(actIndex: number, beatIndex: number): ActorState {
    let ai = actIndex
    let bi = beatIndex
    let actorKey = this.acts[ai].beats[bi].actor
    while (!actorKey) {
      bi--
      if (bi < 0) {
        ai--
        if (ai < 0) {
          return {
            pos: [0, 0, 0],
            facing: 0,
            action: DEFAULT_ACTOR_ACTION,
          }
        }
        bi = this.acts[ai].beats.length - 1
        actorKey = this.acts[ai].beats[bi].actor
      } else {
        actorKey = this.acts[ai].beats[bi].actor
      }
    }
    return {
      pos: actorKey.pos,
      facing: actorKey.facing ?? 0,
      action: actorKey.action ?? DEFAULT_ACTOR_ACTION,
    }
  }

  private buildState(
    actIndex: number,
    beatIndex: number,
    localTime: number,
    beatLocalStart: number,
  ): DirectorState {
    const act = this.acts[actIndex]
    const beat = act.beats[beatIndex]
    const prevBeat = beatIndex > 0 ? act.beats[beatIndex - 1] : null
    const prevActor = this.resolveActor(
      actIndex,
      Math.max(0, beatIndex - (prevBeat ? 1 : 0)),
    )
    const curActor = beat.actor ?? prevActor

    const rawT = (localTime - beatLocalStart) / beat.duration
    const t = ease(Math.max(0, Math.min(1, rawT)))

    // 相机：从 prevBeat 末态插值到 beat.camera
    const prevCam = prevBeat?.camera ?? beat.camera
    const camPos = lerpVec3(prevCam.pos, beat.camera.pos, t)
    const camLook = lerpVec3(prevCam.lookAt, beat.camera.lookAt, t)
    const camFov = lerp(
      prevCam.fov ?? DEFAULT_FOV,
      beat.camera.fov ?? DEFAULT_FOV,
      t,
    )

    // actor：从 prevActor 末态插值到 curActor
    const actorPos = lerpVec3(prevActor.pos, curActor.pos, t)
    const actorFacing = lerp(prevActor.facing, curActor.facing, t)
    const actorAction = rawT >= 1 ? curActor.action : prevActor.action

    // 触发器：仅在进入该 beat 的第一帧（rawT 接近 0）时设
    const justEntered = rawT < 0.05
    const isFirstBeatOfAct = beatIndex === 0
    const title = isFirstBeatOfAct && localTime < 0.5 ? act.title : null

    return {
      actIndex,
      beatIndex,
      beatProgress: rawT,
      camera: { pos: camPos, lookAt: camLook, fov: camFov },
      actor: { pos: actorPos, facing: actorFacing, action: actorAction },
      caption: beat.caption ?? null,
      narration: beat.narration ?? null,
      narrationTrigger: justEntered && beat.narration ? beat.narration : null,
      sfxTrigger: justEntered && beat.sfx ? beat.sfx : null,
      title,
    }
  }
}
