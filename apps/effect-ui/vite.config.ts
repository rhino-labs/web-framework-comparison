import { defineConfig } from 'vite'

// The client bundle hydrates the prerendered pages. `vite build --ssr`
// builds src/prerender.ts, which prerender.mjs uses to write them.
export default defineConfig({
  build: {
    outDir: 'dist/client',
    manifest: true,
    rollupOptions: { input: 'src/main.ts' },
  },
  // @effect/ui picks its production build through package `imports`
  // conditions, so it has to be bundled into the server entry too.
  ssr: { noExternal: true },
})
