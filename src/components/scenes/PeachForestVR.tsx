import { Canvas } from '@react-three/fiber'
import { VRButton, XR, Controllers, Hands } from '@react-three/xr'
import { Suspense } from 'react'
import { DayNightCycle } from '../world/DayNightCycle'
import { InkWashEffect } from '../world/InkWashEffect'
import { ProceduralTrees } from '../world/ProceduralTrees'
import { PetalParticles } from '../world/PetalParticles'
import { Terrain } from '../world/Terrain'
import { Water } from '../world/Water'
import { CaveEntrance, CaveRocks } from './CaveEntrance'
import { useAudio } from '../../engine/AudioManager'
import { SkyDome, GodRay } from './PeachForestScene'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

function VRPlayer({ onTriggerCave }: { onTriggerCave: () => void }) {
  const caveTriggerRef = useRef(false)
  const { camera } = (window as any).__r3f || {}

  return (
    <>
      <Controllers />
      <Hands />
      {/* Cave trigger zone for VR */}
      <mesh
        position={[0, 1.5, -50]}
        onPointerEnter={() => {
          if (!caveTriggerRef.current) {
            caveTriggerRef.current = true
            onTriggerCave()
          }
        }}
        visible={false}
      >
        <sphereGeometry args={[5, 8, 8]} />
        <meshBasicMaterial side={THREE.DoubleSide} />
      </mesh>
    </>
  )
}

export default function PeachForestVR() {
  const { startAmbient, stopAll } = useAudio()
  const audioStarted = useRef(false)

  useEffect(() => {
    return () => stopAll()
  }, [stopAll])

  const handleStart = () => {
    if (!audioStarted.current) {
      audioStarted.current = true
      startAmbient('forest')
    }
  }

  const handleCave = () => {
    stopAll()
    // Trigger scene transition
    ;(window as any).__sceneGoTo?.('cave')
  }

  return (
    <div className="w-full h-full relative" onClick={handleStart}>
      <VRButton className="vr-button" />
      <Canvas
        shadows
        camera={{ position: [0, 1.5, 10], fov: 70, near: 0.1, far: 500 }}
        gl={{ antialias: true, alpha: false }}
        xr
      >
        <XR>
          <fog attach="fog" args={['#3d1f2f', 10, 60]} />
          <DayNightCycle speed={0.015} />
          <SkyDome />
          <GodRay position={[10, 20, -20]} target={[10, 0, -20]} />
          <GodRay position={[-15, 20, -10]} target={[-15, 0, -10]} />
          <GodRay position={[5, 20, -40]} target={[5, 0, -40]} />

          <Suspense fallback={null}>
            <Terrain />
            <Water />
            <ProceduralTrees />
            <PetalParticles />
            <CaveEntrance onTrigger={handleCave} />
            <CaveRocks />
          </Suspense>

          <VRPlayer onTriggerCave={handleCave} />
          <InkWashEffect inkIntensity={1.3} edgeStrength={1.2} paperRoughness={0.35} />
        </XR>
      </Canvas>

      <style>{`
        .vr-button {
          position: absolute !important;
          bottom: 20px !important;
          right: 20px !important;
          z-index: 100 !important;
        }
      `}</style>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none z-10">
        <p className="text-sm opacity-50" style={{ color: '#d4c5a9', letterSpacing: '0.15em' }}>
          🌸 桃花源记 · VR 模式
        </p>
      </div>
    </div>
  )
}
