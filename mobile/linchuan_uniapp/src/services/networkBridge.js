import * as LinchuanNetworkPlugin from '../../uni_modules/linchuan-network'
import { createNetworkBridgeCore } from './networkBridgeCore.js'

export function createNetworkBridge() {
  const plugin = resolvePlugin()
  return createNetworkBridgeCore({
    plugin,
    platform: getPlatform(),
    chooseFile
  })
}

function resolvePlugin() {
  try {
    if (typeof uni === 'undefined' || typeof uni.requireNativePlugin !== 'function') {
      return null
    }
    const nativePlugin = uni.requireNativePlugin('linchuan-network')
    if (nativePlugin && typeof nativePlugin.startDiscovery === 'function') {
      return nativePlugin
    }
  } catch {
    // Fall through to the placeholder check below.
  }

  if (LinchuanNetworkPlugin && LinchuanNetworkPlugin.__linchuanNetworkPlaceholder !== true) {
    if (typeof LinchuanNetworkPlugin.startDiscovery === 'function') {
      return LinchuanNetworkPlugin
    }
  }

  return null
}

function getPlatform() {
  try {
    return uni.getSystemInfoSync().platform || 'unknown'
  } catch {
    return 'unknown'
  }
}

function chooseFile() {
  return new Promise((resolve) => {
    if (typeof uni === 'undefined' || typeof uni.chooseFile !== 'function') {
      resolve(null)
      return
    }

    uni.chooseFile({
      count: 1,
      success(result) {
        const file = result.tempFiles?.[0]
        if (!file) {
          resolve(null)
          return
        }
        resolve({
          name: file.name || file.path?.split('/').pop() || '未命名文件',
          path: file.path || file.tempFilePath,
          size: file.size || 0
        })
      },
      fail() {
        resolve(null)
      }
    })
  })
}
