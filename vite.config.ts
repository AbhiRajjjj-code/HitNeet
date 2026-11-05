/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Allow VS Code port forwarding (Dev Tunnels) links like
    // https://abc123-5173.inc1.devtunnels.ms — Vite blocks unknown hosts by default.
    allowedHosts: ['.devtunnels.ms'],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
