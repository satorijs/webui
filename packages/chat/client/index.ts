import { Context } from '@cordisjs/client'
import {} from '../src'
import Chat from './index.vue'
import './icons'

export default (ctx: Context) => {
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
}
