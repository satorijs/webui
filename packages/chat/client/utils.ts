import { Dict, receive } from '@koishijs/client'
import { Message } from 'koishi-plugin-messages'
import { ref } from 'vue'

export const messages = ref<Dict<Message[]>>({})

receive('chat/message', ({ key, messages: data, history }) => {
  (messages.value[key] ||= [])[history ? 'unshift' : 'push'](...data)
})
