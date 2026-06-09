import { build } from 'esbuild'
import { rmSync } from 'fs'

// Clean old tsc output
rmSync('dist-electron', { recursive: true, force: true })

// Bundle main process into single CJS file
await build({
  entryPoints: ['electron/main.ts'],
  bundle: true,
  outfile: 'dist-electron/main.cjs',
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  external: ['electron'],
})

// Transpile preload script separately (not bundled, electron APIs provided by runtime)
await build({
  entryPoints: ['electron/preload.ts'],
  bundle: false,
  outfile: 'dist-electron/preload.js',
  platform: 'node',
  target: 'node20',
  format: 'cjs',
})

console.log('Electron build complete.')
