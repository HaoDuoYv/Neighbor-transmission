import { defineConfig } from 'vite'
import uniModule from '@dcloudio/vite-plugin-uni'
import { resolve } from 'path'

const uni = typeof uniModule === 'function' ? uniModule : uniModule.default
const appOnlyAliases = process.env.UNI_PLATFORM === 'app'
  ? [
      {
        find: /^vue$/,
        replacement: resolve(__dirname, 'src/shims/vue-with-ssr-flag.js')
      }
    ]
  : []

export default defineConfig({
  plugins: [uni()],
  resolve: {
    alias: appOnlyAliases
  },
  server: {
    host: '0.0.0.0'
  }
})
