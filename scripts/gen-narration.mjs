#!/usr/bin/env node
/**
 * 批量生成旁白音频：读 script.ts 的 narration → macOS say 生成 aiff → ffmpeg 转 mp3
 * 用法：node scripts/gen-narration.mjs
 * 依赖：macOS say + ffmpeg（homebrew）
 */
import { execSync } from 'node:child_process'
import { mkdirSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const outDir = join(root, 'public/narration')
const tmpDir = join(root, 'node_modules/.cache/narration-tmp')

// 语音选择（Tingting 经典稳定；可换 Reed 等神经语音）
const VOICE = process.env.NARRATION_VOICE || 'Tingting'
const FFMPEG = '/opt/homebrew/bin/ffmpeg'

mkdirSync(outDir, { recursive: true })
mkdirSync(tmpDir, { recursive: true })

// 从 script.ts 提取 narration（动态 import 拿 ACTS）
const { ACTS } = await import(join(root, 'src/cinematic/script.ts'))

let count = 0
let failed = 0
for (let ai = 0; ai < ACTS.length; ai++) {
  const act = ACTS[ai]
  for (let bi = 0; bi < act.beats.length; bi++) {
    const beat = act.beats[bi]
    if (!beat.narration) continue
    count++
    const id = `${ai + 1}-${bi + 1}`
    const mp3Path = join(outDir, `${id}.mp3`)
    const aiffPath = join(tmpDir, `${id}.aiff`)

    // 跳过已存在（除非 --force）
    if (existsSync(mp3Path) && !process.env.FORCE) {
      console.log(`[${id}] 已存在，跳过（FORCE=1 重生成）`)
      continue
    }

    try {
      // say 生成 aiff（转义引号）
      execSync(`say -v ${VOICE} ${JSON.stringify(beat.narration)} -o ${JSON.stringify(aiffPath)}`, { stdio: 'pipe' })
      // ffmpeg 转 mp3（96k 够语音用，体积小）
      execSync(`${FFMPEG} -y -i ${JSON.stringify(aiffPath)} -b:a 96k ${JSON.stringify(mp3Path)}`, { stdio: 'pipe' })
      console.log(`[${id}] ✓ ${beat.narration.slice(0, 20)}...`)
    } catch (e) {
      failed++
      console.error(`[${id}] ✗ 失败: ${e.message.slice(0, 80)}`)
    }
  }
}

// 清理临时 aiff
try { rmSync(tmpDir, { recursive: true, force: true }) } catch {}

console.log(`\n完成：${count - failed}/${count} 段（语音 ${VOICE}）→ public/narration/`)
if (failed > 0) process.exit(1)
