import { defineConfig } from 'vite'
import vinext from 'vinext'

// Used only by the vinext build. `next build` ignores this file and both
// builds compile the exact same app/ directory.
export default defineConfig({
  plugins: [vinext()],
})
