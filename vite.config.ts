import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const pagesBase = process.env.PAGES_BASE

export default defineConfig({
  base: pagesBase || '/',
  plugins: [react(), tailwindcss()],
  server: { host: true, port: 5173 },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'three-core': ['three'],
          'r3f': ['@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
})
