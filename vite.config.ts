/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Bé Học Vui',
        short_name: 'Bé Học Vui',
        description: 'Học chữ cái, đánh vần và làm quen với số cho bé chuẩn bị vào lớp 1',
        lang: 'vi',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#fff8ec',
        theme_color: '#fff8ec',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The app shell is cached up front; audio is cached the first time each file plays,
        // so a new device does not download every lesson's audio on first visit.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['audio/**'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/audio/') && url.pathname.endsWith('.mp3'),
            handler: 'CacheFirst',
            options: { cacheName: 'audio', expiration: { maxEntries: 3000 } },
          },
          {
            urlPattern: ({ url }) => url.pathname === '/audio/manifest.json',
            handler: 'NetworkFirst',
            options: { cacheName: 'audio-manifest' },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
  },
})
