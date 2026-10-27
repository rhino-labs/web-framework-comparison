import { defineConfig } from 'vite'

// The client bundle hydrates the prerendered pages. `vite build --ssr`
// builds the server entry that prerender.mjs uses to write them.
export default defineConfig({
  build: {
    outDir: 'dist/client',
    manifest: true,
    rollupOptions: { input: 'src/EntryClient.res.mjs' },
  },
})
