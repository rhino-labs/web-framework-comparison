import { defineConfig } from 'astro/config'
import react from '@astrojs/react'

// Static output: every page is prerendered at build time, and each
// interactive component is a React island hydrated with client:load.
export default defineConfig({
  output: 'static',
  integrations: [react()],
})
