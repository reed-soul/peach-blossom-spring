import { lazy, Suspense } from 'react'

const VillageSceneContent = lazy(() => import('./VillageSceneContent'))

export default function VillageScene() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-full bg-black flex items-center justify-center">
          <p style={{ color: '#d4c5a9', letterSpacing: '0.1em' }}>桃源村加载中…</p>
        </div>
      }
    >
      <VillageSceneContent />
    </Suspense>
  )
}
