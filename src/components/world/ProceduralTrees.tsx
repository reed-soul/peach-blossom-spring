import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { createNoise2D } from 'simplex-noise'

const noise2D = createNoise2D()
const TREE_COUNT = 500
const CANOPY_COLORS = [0xffb7c5, 0xffc0cb, 0xffe4e1, 0xffffff, 0xff9eaf]

export function ProceduralTrees() {
  const trunkRef = useRef<THREE.InstancedMesh>(null)
  const canopyRef = useRef<THREE.InstancedMesh>(null)

  const trees = useMemo(() => {
    const result: { x: number; z: number; height: number; canopyR: number; rot: number }[] = []
    for (let i = 0; i < TREE_COUNT; i++) {
      const x = (Math.random() - 0.5) * 120
      const z = (Math.random() - 0.5) * 120
      const density = noise2D(x * 0.03, z * 0.03)
      if (density < -0.2) continue
      if (Math.abs(x) < 3 && Math.abs(z) < 3) continue
      result.push({
        x,
        z,
        height: 3 + Math.random() * 4,
        canopyR: 1.5 + Math.random() * 1.5,
        rot: Math.random() * Math.PI * 2,
      })
    }
    return result
  }, [])

  // Use useEffect so refs are assigned before we access them
  useEffect(() => {
    const trunk = trunkRef.current
    const canopy = canopyRef.current
    if (!trunk || !canopy) return

    const dummy = new THREE.Object3D()
    trees.forEach((t, i) => {
      dummy.position.set(t.x, t.height * 0.5, t.z)
      dummy.scale.set(0.3, t.height, 0.3)
      dummy.rotation.set(0, t.rot, 0)
      dummy.updateMatrix()
      trunk.setMatrixAt(i, dummy.matrix)

      dummy.position.set(t.x, t.height + t.canopyR * 0.5, t.z)
      dummy.scale.set(t.canopyR, t.canopyR * 0.8, t.canopyR)
      dummy.updateMatrix()
      canopy.setMatrixAt(i, dummy.matrix)

      const color = new THREE.Color(CANOPY_COLORS[i % CANOPY_COLORS.length])
      canopy.setColorAt(i, color)
    })

    trunk.instanceMatrix.needsUpdate = true
    canopy.instanceMatrix.needsUpdate = true
    if (canopy.instanceColor) canopy.instanceColor.needsUpdate = true
  }, [trees])

  return (
    <>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, trees.length]} castShadow>
        <cylinderGeometry args={[0.5, 0.7, 1, 6]} />
        <meshStandardMaterial color={0x5d4037} />
      </instancedMesh>
      <instancedMesh ref={canopyRef} args={[undefined, undefined, trees.length]} castShadow>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color={0xffb7c5} roughness={0.8} />
      </instancedMesh>
    </>
  )
}
