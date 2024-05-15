import { Context } from '@cordisjs/client'
import HTTP from '@cordisjs/plugin-http'
import Satori from '@satorijs/core'
import SatoriAdapter from '@satorijs/adapter-satori'
import {} from '../src'
import Chat from './index.vue'
import './icons'

export default (ctx: Context) => {
  ctx.plugin(HTTP)
  ctx.plugin(Satori)

  ctx.inject(['satori'], (ctx) => {
    ctx.plugin(SatoriAdapter, {
      endpoint: new URL('/satori', location.href).href,
    })

    ctx.page({
      path: '/chat',
      name: '聊天',
      icon: 'activity:chat',
      order: 100,
      component: Chat,
    })

    ctx.menu('chat.message', [{
      id: '.delete',
      label: '删除消息',
    }, {
      id: '.quote',
      label: '引用回复',
    }])
  })
}
