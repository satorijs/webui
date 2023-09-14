import { Dict, receive } from '@koishijs/client'
import { Message } from 'koishi-plugin-messages'
import type { Universal } from 'koishi'
import { ref } from 'vue'

export const messages = ref<Dict<Message[]>>({})
export const members = ref<Dict<Universal.GuildMember[]>>({})

receive('chat/message', ({ key, messages: data, history }) => {
  (messages.value[key] ||= [])[history ? 'unshift' : 'push'](...data)
})
