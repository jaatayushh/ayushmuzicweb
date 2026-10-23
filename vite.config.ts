import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    base: '/',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          // Precache the app shell only — audio is intentionally excluded so
          // playback always streams live from the HF CDN at full speed.
          globPatterns: ['**/*.{js,css,html,svg,ico}'],
          runtimeCaching: [
            {
              // Cover art served from the Hugging Face dataset (.jpg posters).
              // CacheFirst = once downloaded, an image is NEVER re-fetched
              // again (same bytes, same quality) until it falls out of the
              // 60‑day / 500‑entry window. This is the single biggest data
              // saver since the same posters render repeatedly across the
              // home grid, search, queue, and now-playing views.
              urlPattern: ({ url }: { url: URL }) =>
                url.hostname === 'huggingface.co' && /\.(jpg|jpeg|png|webp)$/i.test(url.pathname),
              handler: 'CacheFirst',
              options: {
                cacheName: 'hf-cover-art',
                expiration: {
                  maxEntries: 500,
                  maxAgeSeconds: 60 * 60 * 24 * 60, // 60 days
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Track-list metadata (JSON tree listing). NetworkFirst so the
              // list is always fetched fresh — this only falls back to a
              // cached copy if the network is genuinely unreachable (offline),
              // rather than showing a possibly-stale list by default.
              urlPattern: ({ url }: { url: URL }) => url.pathname === '/api/hf-tree',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'hf-tree-metadata',
                networkTimeoutSeconds: 8,
                expiration: {
                  maxEntries: 5,
                  maxAgeSeconds: 60 * 5, // 5 minutes — offline fallback only
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        manifest: {
          name: 'AyushMuzic',
          short_name: 'AyushMuzic',
          description: 'A powerful AyushMuzic web player.',
          theme_color: '#121212',
          background_color: '#121212',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-maskable-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: 'pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: ['**/website/**', '**/downloads/**', '**/data/**'],
      },
    },
  };
});

