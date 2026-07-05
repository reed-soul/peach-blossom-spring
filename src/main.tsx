import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { extend } from '@react-three/fiber'
import * as THREE from 'three/webgpu'
import './index.css'
import App from './App'

// Register ALL three/webgpu classes with R3F so the JSX namespace recognizes
// node-material elements (e.g. <meshBasicNodeMaterial>, <meshStandardNodeMaterial>)
// required for TSL/WebGPU. This must run before any Canvas mounts.
extend(THREE)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
