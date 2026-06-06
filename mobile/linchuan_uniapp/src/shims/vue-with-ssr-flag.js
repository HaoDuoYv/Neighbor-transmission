export * from 'vue/dist/vue.runtime.esm-bundler.js'
export { default } from 'vue/dist/vue.runtime.esm-bundler.js'

export const isInSSRComponentSetup = false

export function injectHook(type, hook, target, prepend = false) {
  if (!target) return hook
  const hooks = target[type] || (target[type] = [])
  if (prepend) {
    hooks.unshift(hook)
  } else {
    hooks.push(hook)
  }
  return hook
}
