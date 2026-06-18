#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { readdirSync, mkdirSync } from 'node:fs'
import { basename, join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const inputDir = join(root, 'content/narrative')
const outputDir = join(root, 'src/narrative')

mkdirSync(outputDir, { recursive: true })

const inkFiles = readdirSync(inputDir).filter((f) => f.endsWith('.ink'))
if (inkFiles.length === 0) {
  console.error('No .ink files found in content/narrative')
  process.exit(1)
}

for (const file of inkFiles) {
  const name = basename(file, '.ink')
  const input = join(inputDir, file)
  const output = join(outputDir, `${name}.json`)
  execFileSync(join(root, 'node_modules/.bin/inkjs-compiler'), [input, '-o', output], { stdio: 'inherit' })
  console.log(`Compiled ${file} -> src/narrative/${name}.json`)
}
