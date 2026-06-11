import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Serve from /card-game-react/ on GitHub Pages; root everywhere else.
  base: process.env.GITHUB_ACTIONS ? '/card-game-react/' : '/',
})
