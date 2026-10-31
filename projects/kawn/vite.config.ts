import { defineConfig } from 'vite'

// Relative base so the build runs from any folder, a static host, or as one
// self-contained file (see scripts/inline.mjs).
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    modulePreload: { polyfill: false },
    assetsInlineLimit: 100_000,
    chunkSizeWarningLimit: 1200,
  },
})
