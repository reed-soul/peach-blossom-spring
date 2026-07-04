import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createPetalAlphaTexture } from './proceduralTextures'

const PETAL_COUNT = 3000
const PETAL_COLORS = [0xffb7c5, 0xffc0cb, 0xffe4e1, 0xffffff, 0xff9eaf]

export function PetalParticles() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const petalTex = useMemo(() => createPetalAlphaTexture(), [])

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: petalTex,
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        alphaTest: 0.12,
        depthWrite: false,
        roughness: 0.9,
      }),
    [petalTex],
  )

  const petals = useMemo(() => {
    return Array.from({ length: PETAL_COUNT }, () => ({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 120,
        Math.random() * 20,
        (Math.random() - 0.5) * 120,
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        -0.5 - Math.random() * 0.5,
        (Math.random() - 0.5) * 0.3,
      ),
      rotation: new THREE.Euler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
      ),
      rotSpeed: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
      ),
      phase: Math.random() * Math.PI * 2,
      tint: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
    }))
  }, [])

  const colorArr = useMemo(() => {
    const arr = new Float32Array(PETAL_COUNT * 3)
    const c = new THREE.Color()
    petals.forEach((p, i) => {
      c.setHex(p.tint)
      arr[i * 3] = c.r
      arr[i * 3 + 1] = c.g
      arr[i * 3 + 2] = c.b
    })
    return arr
  }, [petals])

  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame((state) => {
    if (!meshRef.current) return
    const time = state.clock.elapsedTime

    petals.forEach((p, i) => {
      const windX = Math.sin(time * 0.5 + p.phase) * 0.3
      const windZ = Math.cos(time * 0.3 + p.phase) * 0.2

      p.position.x += (p.velocity.x + windX) * 0.016
      p.position.y += p.velocity.y * 0.016
      p.position.z += (p.velocity.z + windZ) * 0.016

      p.rotation.x += p.rotSpeed.x * 0.016
      p.rotation.y += p.rotSpeed.y * 0.016
      p.rotation.z += p.rotSpeed.z * 0.016

      if (p.position.y < 0) {
        p.position.set(
          (Math.random() - 0.5) * 120,
          15 + Math.random() * 10,
          (Math.random() - 0.5) * 120,
        )
      }

      dummy.position.copy(p.position)
      dummy.rotation.copy(p.rotation)
      dummy.scale.set(0.12, 0.16, 0.04)
      dummy.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.matrix)
    })

    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, material, PETAL_COUNT]}>
      <planeGeometry args={[1, 1]} />
      <instancedBufferAttribute attach="instanceColor" args={[colorArr, 3]} />
    </instancedMesh>
  )
}
