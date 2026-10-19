import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id: string): string | undefined {
          if (id.includes('/node_modules/three/')) return 'three';
          if (id.includes('/node_modules/@react-three/drei/')) return 'drei';
          if (id.includes('/node_modules/@react-three/fiber/')) return 'fiber';
          if (id.includes('/node_modules/@react-three/postprocessing/') || id.includes('/node_modules/postprocessing/')) return 'postprocessing';
          if (id.includes('/node_modules/troika-')) return 'troika';
          if (id.includes('/node_modules/gsap/')) return 'gsap';
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/') || id.includes('/node_modules/scheduler/')) return 'react';
          if (id.includes('/node_modules/')) return 'vendor';
        }
      }
    }
  }
})
