import { Dict, receive } from '@koishijs/client'
import { Message } from 'koishi-plugin-messages'
import type { Universal } from 'koishi'
import { ref } from 'vue'

declare module '@koishijs/client' {
  interface ActionContext {
    'chat.message': Message
  }
}

export const messages = ref<Dict<Message[]>>({})
export const members = ref<Dict<Universal.List<Universal.GuildMember>>>({})

receive('chat/message', ({ key, messages: data, history }) => {
  (messages.value[key] ||= [])[history ? 'unshift' : 'push'](...data)
})

receive('chat/member', ({ key, value }) => {
  if (!members.value[key]) {
    members.value[key] = value
  } else {
    members.value[key].data.push(...value.data)
    members.value[key].next = value.next
  }
})
