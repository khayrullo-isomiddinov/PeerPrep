import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'suppress-css-property-warnings',
      buildStart() {
        const originalWarn = console.warn
        console.warn = (...args) => {
          const message = String(args[0] || '')
          if (message.includes('@property') || message.includes('Unknown at rule: @property')) {
            return 
          }
          originalWarn.apply(console, args)
        }
      }
    }
  ],
  build: {
    cssCodeSplit: true
  }
})
