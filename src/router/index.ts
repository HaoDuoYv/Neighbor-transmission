import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/devices'
    },
    {
      path: '/devices',
      name: 'DeviceList',
      component: () => import('@/views/DeviceList.vue')
    },
    {
      path: '/chat/:deviceId?',
      name: 'Chat',
      component: () => import('@/views/Chat.vue')
    },
    {
      path: '/transfer',
      name: 'FileTransfer',
      component: () => import('@/views/FileTransfer.vue')
    },
    {
      path: '/files',
      name: 'FileLibrary',
      component: () => import('@/views/FileLibrary.vue')
    },
    {
      path: '/remote',
      name: 'RemoteTransfer',
      component: () => import('@/views/RemoteTransfer.vue')
    },
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('@/views/Settings.vue')
    }
  ]
})

export default router
