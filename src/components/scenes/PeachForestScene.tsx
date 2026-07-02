import { lazy, Suspense } from 'react'

const PeachForestSceneContent = lazy(() => import('./PeachForestSceneContent'))

export default function PeachForestScene() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-full bg-black flex items-center justify-center">
          <p style={{ color: '#d4c5a9', letterSpacing: '0.1em' }}>桃花林加载中…</p>
        </div>
      }
    >
      <PeachForestSceneContent />
    </Suspense>
  )
}
