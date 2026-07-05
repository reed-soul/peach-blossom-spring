// TEMPORARY debug component — Phase 1 verification.
// Renders a single peach tree skeleton with MeshNormalMaterial so the Weber-Penn
// silhouette can be inspected visually before foliage/shaders are wired up.
//
// DELETE in Phase 5 once SeedThreeForest is integrated, OR keep behind a
// ?debugSkeleton query flag if it stays useful.

import { useMemo } from 'react'
import * as THREE from 'three/webgpu'
import { Rng } from './core/rng'
import { generateSkeleton } from './core/weber-penn'
import { buildBranchGeometry } from './core/branch-mesh'
import { peach } from './species/peach'

export function DebugSkeleton({
  position = [0, 0, -10] as [number, number, number],
  seed = 'peach-debug',
}: {
  position?: [number, number, number]
  seed?: string | number
}) {
  const geometry = useMemo(() => {
    const rng = new Rng(seed)
    const { stems } = generateSkeleton(peach.params, rng)
    return buildBranchGeometry(stems, { tileWorldSize: peach.tileWorldSize })
  }, [seed])

  return (
    <group position={position}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshNormalMaterial />
      </mesh>
      {/* Skeleton tip markers — visualize where foliage will attach */}
      <TipMarkers seed={seed} />
    </group>
  )
}

function TipMarkers({ seed }: { seed: string | number }) {
  const tips = useMemo(() => {
    const rng = new Rng(seed)
    const { tips } = generateSkeleton(peach.params, rng)
    return tips
  }, [seed])

  const geom = useMemo(() => new THREE.SphereGeometry(0.08, 8, 6), [])

  return (
    <group>
      {tips.map((t, i) => (
        <mesh key={i} geometry={geom} position={t.position}>
          <meshBasicMaterial color={0xff6b9d} />
        </mesh>
      ))}
    </group>
  )
}
