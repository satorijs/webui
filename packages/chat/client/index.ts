import { Context } from '@koishijs/client'
import Chat from './chat.vue'
import './icons'

export default (ctx: Context) => {
  ctx.page({
    path: '/chat',
    name: '聊天',
    icon: 'activity:comments',
    authority: 3,
    fields: ['chat'],
    component: Chat,
    order: 100,
  })

  ctx.menu('chat.message', [{
    id: '.delete',
    label: '删除消息',
  }, {
    id: '.quote',
    label: '引用回复',
  }])
}
