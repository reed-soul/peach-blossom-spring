import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
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
      if (density < -0.2) continue // Skip low-density areas
      // Don't place trees right on spawn
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

  useMemo(() => {
    if (!trunkRef.current || !canopyRef.current) return
    const dummy = new THREE.Object3D()

    trees.forEach((t, i) => {
      // Trunk
      dummy.position.set(t.x, t.height * 0.5, t.z)
      dummy.scale.set(0.3, t.height, 0.3)
      dummy.rotation.set(0, t.rot, 0)
      dummy.updateMatrix()
      trunkRef.current!.setMatrixAt(i, dummy.matrix)

      // Canopy - cluster of spheres
      dummy.position.set(t.x, t.height + t.canopyR * 0.5, t.z)
      dummy.scale.set(t.canopyR, t.canopyR * 0.8, t.canopyR)
      dummy.updateMatrix()
      canopyRef.current!.setMatrixAt(i, dummy.matrix)

      // Color variation
      const color = new THREE.Color(CANOPY_COLORS[i % CANOPY_COLORS.length])
      canopyRef.current!.setColorAt(i, color)
    })

    trunkRef.current.instanceMatrix.needsUpdate = true
    canopyRef.current.instanceMatrix.needsUpdate = true
    if (canopyRef.current.instanceColor) canopyRef.current.instanceColor.needsUpdate = true
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
