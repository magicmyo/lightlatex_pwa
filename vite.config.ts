import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,wasm,cls}'],
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024,
        runtimeCaching: [
          {
            // Cache CTAN package files fetched by the SwiftLaTeX pdfTeX worker.
            // CacheFirst keeps packages available for offline compiles after the
            // first online compile that fetches them.
            // texlive.swiftlatex.com is dead (NXDOMAIN); texlive.texlyre.org is
            // the maintained drop-in replacement used in engine.setTexliveEndpoint.
            urlPattern: /^https:\/\/texlive\.texlyre\.org\//i,
            handler: 'CacheFirst' as const,
            options: {
              cacheName: 'texlive-packages',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 90, // 90 days
              },
              cacheableResponse: {
                statuses: [0, 200], // 0 = opaque cross-origin response
              },
            },
          },
        ],
      },
      manifest: {
        name: 'LightLaTeX',
        short_name: 'LightLaTeX',
        description: 'Free offline LaTeX editor and Overleaf alternative — works entirely in your browser.',
        theme_color: '#1a73e8',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: [
      {
        find: '@/features/utils/material-icon',
        replacement: path.resolve(__dirname, 'src/utils/material-icon.ts'),
      },
      {
        find: '@/features/mathjax/load-mathjax',
        replacement: path.resolve(__dirname, 'src/utils/load-mathjax.ts'),
      },
      {
        find: '@/features/source-editor',
        replacement: path.resolve(__dirname, 'src'),
      },
      { find: '@', replacement: path.resolve(__dirname, 'src') },
    ],
  },
  worker: {
    format: 'es',
  },
})
