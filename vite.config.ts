import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const pagesBase = process.env.PAGES_BASE

export default defineConfig({
  base: pagesBase || '/',
  plugins: [react(), tailwindcss()],
  server: { host: true, port: 5173 },
  build: {
    // rapier compat 内联 WASM ~2MB 是已知 lazy chunk，提高警告阈值减少噪音
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks: {
          'three-core': ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
          // inkjs 叙事引擎单独拆分
          ink: ['inkjs'],
        },
      },
    },
  },
})
