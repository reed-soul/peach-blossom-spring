export {}
import type { ThreeToJSXElements } from '@react-three/fiber'
import type * as THREE from 'three/webgpu'

// R3F v9 + React 19 + three/webgpu JSX namespace augmentation.
// Augments React.JSX.IntrinsicElements with all three/webgpu classes
// (including the *NodeMaterial family needed for TSL).
declare module '@react-three/fiber' {
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}
