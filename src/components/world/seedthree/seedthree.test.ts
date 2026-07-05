// Phase 1 verification tests — Weber-Penn skeleton + branch mesh integrity.
import { describe, it, expect } from 'vitest'
import { Rng } from './core/rng'
import { generateSkeleton } from './core/weber-penn'
import { buildBranchGeometry } from './core/branch-mesh'
import { buildFoliage } from './core/leafCards'
import { peach } from './species/peach'
import { DEFAULT_LOD_LEVELS } from './SeedTreeLod'

function countNaN(arr: ArrayLike<number>): number {
  let n = 0
  for (let i = 0; i < arr.length; i++) if (Number.isNaN(arr[i]!)) n++
  return n
}

describe('Rng', () => {
  it('is deterministic for the same seed', () => {
    const a = new Rng('peach-1')
    const b = new Rng('peach-1')
    expect(a.next()).toBe(b.next())
    expect(a.next()).toBe(b.next())
  })

  it('differs across seeds', () => {
    const a = new Rng('a')
    const b = new Rng('b')
    expect(a.next()).not.toBe(b.next())
  })

  it('produces values in [0,1)', () => {
    const r = new Rng(42)
    for (let i = 0; i < 1000; i++) {
      const v = r.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('generateSkeleton (peach preset)', () => {
  it('produces stems and tips with no NaN positions', () => {
    const rng = new Rng('peach-tree-1')
    const { stems, tips } = generateSkeleton(peach.params, rng)
    expect(stems.length).toBeGreaterThan(0)
    expect(tips.length).toBeGreaterThan(0)
    for (const s of stems) {
      for (const p of s.points) {
        expect(Number.isFinite(p.x)).toBe(true)
        expect(Number.isFinite(p.y)).toBe(true)
        expect(Number.isFinite(p.z)).toBe(true)
      }
      for (const r of s.radii) expect(Number.isFinite(r) && r > 0).toBe(true)
      expect(s.winds.length).toBe(s.points.length)
    }
  })

  it('has one trunk (level 0) and deeper branches', () => {
    const rng = new Rng('peach-tree-2')
    const { stems } = generateSkeleton(peach.params, rng)
    const levels = new Set(stems.map((s) => s.level))
    expect(levels.has(0)).toBe(true)
    expect(levels.has(1)).toBe(true)
    expect(levels.has(2)).toBe(true)
  })

  it('is reproducible', () => {
    const a = generateSkeleton(peach.params, new Rng('repro'))
    const b = generateSkeleton(peach.params, new Rng('repro'))
    expect(a.stems.length).toBe(b.stems.length)
    expect(a.tips.length).toBe(b.tips.length)
    const pa = a.stems[0]!.points[0]!
    const pb = b.stems[0]!.points[0]!
    expect(pa.x).toBe(pb.x)
    expect(pa.y).toBe(pb.y)
    expect(pa.z).toBe(pb.z)
  })

  it('peach is roughly the configured height (~6 m)', () => {
    const { stems } = generateSkeleton(peach.params, new Rng('height-check'))
    const trunk = stems.find((s) => s.level === 0)!
    const topY = Math.max(...trunk.points.map((p) => p.y))
    // Allow scale + scaleV variance: 6 ± 1.2.
    expect(topY).toBeGreaterThan(4)
    expect(topY).toBeLessThan(9)
  })
})

describe('buildBranchGeometry', () => {
  it('emits a valid BufferGeometry with custom attributes', () => {
    const { stems } = generateSkeleton(peach.params, new Rng('geo-check'))
    const geo = buildBranchGeometry(stems, { tileWorldSize: peach.tileWorldSize })
    expect(geo.getAttribute('position')).toBeTruthy()
    expect(geo.getAttribute('normal')).toBeTruthy()
    expect(geo.getAttribute('uv')).toBeTruthy()
    expect(geo.getAttribute('aWind')).toBeTruthy()
    expect(geo.getAttribute('aStemCenter')).toBeTruthy()
    expect(geo.index).toBeTruthy()
  })

  it('has no NaN values in any attribute', () => {
    const { stems } = generateSkeleton(peach.params, new Rng('nan-check'))
    const geo = buildBranchGeometry(stems, { tileWorldSize: peach.tileWorldSize })
    expect(countNaN(geo.getAttribute('position').array)).toBe(0)
    expect(countNaN(geo.getAttribute('normal').array)).toBe(0)
    expect(countNaN(geo.getAttribute('uv').array)).toBe(0)
    expect(countNaN(geo.getAttribute('aWind').array)).toBe(0)
    expect(countNaN(geo.getAttribute('aStemCenter').array)).toBe(0)
  })

  it('all indices are in range', () => {
    const { stems } = generateSkeleton(peach.params, new Rng('idx-check'))
    const geo = buildBranchGeometry(stems, { tileWorldSize: peach.tileWorldSize })
    const idx = geo.index!.array
    const vertCount = geo.getAttribute('position').count
    for (let i = 0; i < idx.length; i++) {
      expect(idx[i]!).toBeGreaterThanOrEqual(0)
      expect(idx[i]!).toBeLessThan(vertCount)
    }
  })

  it('aWind values are in [0, 1]', () => {
    const { stems } = generateSkeleton(peach.params, new Rng('wind-check'))
    const geo = buildBranchGeometry(stems, { tileWorldSize: peach.tileWorldSize })
    const w = geo.getAttribute('aWind').array
    for (let i = 0; i < w.length; i++) {
      expect(w[i]!).toBeGreaterThanOrEqual(0)
      expect(w[i]!).toBeLessThanOrEqual(1)
    }
  })

  it('LOD ringStride produces fewer vertices but still valid geometry', () => {
    const { stems } = generateSkeleton(peach.params, new Rng('lod-check'))
    const full = buildBranchGeometry(stems, { tileWorldSize: peach.tileWorldSize })
    const decimated = buildBranchGeometry(stems, {
      tileWorldSize: peach.tileWorldSize,
      ringStride: 2,
      radialScale: 0.6,
    })
    expect(decimated.getAttribute('position').count).toBeLessThan(
      full.getAttribute('position').count,
    )
    expect(countNaN(decimated.getAttribute('position').array)).toBe(0)
  })
})

describe('buildFoliage', () => {
  it('produces instanced petal cards with valid attributes', () => {
    const rng = new Rng('foliage-check')
    const { tips } = generateSkeleton(peach.params, rng)
    const result = buildFoliage(
      tips,
      peach.foliage,
      new Rng('foliage-petal-rng'),
    )
    expect(result).not.toBeNull()
    const r = result!
    expect(r.count).toBeGreaterThan(0)
    expect(r.matrices.length).toBe(r.count)
    expect(r.geometry.getAttribute('aWindVec')).toBeTruthy()
    expect(r.geometry.getAttribute('aAnchorPos')).toBeTruthy()
    expect(r.geometry.getAttribute('aThickness')).toBeTruthy()
  })

  it('has no NaN in any instance attribute', () => {
    const { tips } = generateSkeleton(peach.params, new Rng('foliage-nan'))
    const r = buildFoliage(tips, peach.foliage, new Rng('foliage-petal-nan'))!
    expect(countNaN(r.geometry.getAttribute('aWindVec').array)).toBe(0)
    expect(countNaN(r.geometry.getAttribute('aAnchorPos').array)).toBe(0)
    expect(countNaN(r.geometry.getAttribute('aThickness').array)).toBe(0)
  })

  it('per-petal matrices are all finite and non-degenerate', () => {
    const { tips } = generateSkeleton(peach.params, new Rng('foliage-mat'))
    const r = buildFoliage(tips, peach.foliage, new Rng('foliage-petal-mat'))!
    for (const m of r.matrices) {
      const e = m.elements
      for (let i = 0; i < 16; i++) expect(Number.isFinite(e[i])).toBe(true)
      // Determinant nonzero (not a collapsed transform).
      const det =
        e[0]! * (e[5]! * e[10]! - e[6]! * e[9]!) -
        e[1]! * (e[4]! * e[10]! - e[6]! * e[8]!) +
        e[2]! * (e[4]! * e[9]! - e[5]! * e[8]!)
      expect(Math.abs(det)).toBeGreaterThan(1e-8)
    }
  })

  it('canopy bottom sits below or at the canopy centroid', () => {
    const { tips } = generateSkeleton(peach.params, new Rng('foliage-dome'))
    const r = buildFoliage(tips, peach.foliage, new Rng('foliage-petal-dome'))!
    // canopyBottom.y should be ≤ min tip y (the dome origin is below the canopy).
    const minTipY = Math.min(...tips.map((t) => t.position.y))
    expect(r.canopyBottom.y).toBeLessThanOrEqual(minTipY + 0.001)
  })
})

describe('LOD level spec', () => {
  it('DEFAULT_LOD_LEVELS has 2 mesh levels with decreasing detail', () => {
    expect(DEFAULT_LOD_LEVELS.length).toBe(2)
    expect(DEFAULT_LOD_LEVELS[0]!.distance).toBe(0)
    expect(DEFAULT_LOD_LEVELS[1]!.radialScale).toBeLessThan(DEFAULT_LOD_LEVELS[0]!.radialScale)
    expect(DEFAULT_LOD_LEVELS[1]!.petalDensity).toBeLessThanOrEqual(DEFAULT_LOD_LEVELS[0]!.petalDensity)
  })
})
