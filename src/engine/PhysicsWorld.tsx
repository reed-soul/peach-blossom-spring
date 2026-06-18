import { lazy, Suspense, type ReactNode } from 'react'

type Gravity = [number, number, number]

const LazyPhysics = lazy(() =>
  import('@react-three/rapier').then((mod) => ({
    default: function PhysicsShell({
      children,
      gravity = [0, -9.81, 0] as Gravity,
    }: {
      children: ReactNode
      gravity?: Gravity
    }) {
      return <mod.Physics gravity={gravity}>{children}</mod.Physics>
    },
  })),
)

export function PhysicsWorld({
  children,
  gravity = [0, -9.81, 0],
}: {
  children: ReactNode
  gravity?: Gravity
}) {
  return (
    <Suspense fallback={null}>
      <LazyPhysics gravity={gravity}>{children}</LazyPhysics>
    </Suspense>
  )
}
