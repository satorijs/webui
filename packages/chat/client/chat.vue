<template>
  <k-layout class="page-chat">
    <template #title>
      {{ header }}
    </template>

    <template #left>
      <el-scrollbar>
        <!-- <template v-for="({ name, channels }, id) in guilds" :key="id">
          <div class="k-tab-group-title">{{ name }}</div>
          <template v-for="({ name }, key) in channels" :key="key">
            <k-tab-item v-model="current" :label="id + '/' + key">
              {{ name }}
            </k-tab-item>
          </template>
        </template> -->
        <template v-for="({ name }, id) in store.chat" :key="id">
          <k-tab-item v-model="current" :label="id">
            {{ name || '未知频道' }}
          </k-tab-item>
        </template>
      </el-scrollbar>
    </template>

    <keep-alive>
      <template v-if="current" :key="current">
        <virtual-list :data="filtered" pinned v-model:active-key="index" key-name="messageId">
          <template #header><div class="header-padding"></div></template>
          <template #="data">
            <chat-message :successive="isSuccessive(data, data.index)" :data="data"></chat-message>
          </template>
          <template #footer><div class="footer-padding"></div></template>
        </virtual-list>
        <div class="card-footer">
          <chat-input @send="handleSend"></chat-input>
        </div>
      </template>
      <template v-else>
        <k-empty>
          <div>请在左侧选择频道</div>
        </k-empty>
      </template>
    </keep-alive>
  </k-layout>
</template>

<script lang="ts" setup>

import { ChatInput, store, VirtualList } from '@koishijs/client'
import { computed, ref } from 'vue'
import type { Message } from 'koishi-plugin-messages'
import { messages } from './utils'
import ChatMessage from './message.vue'

const index = ref<string>()
const current = ref<string>('')

// const guilds = computed(() => {
//   const guilds: Dict<{
//     name: string
//     channels: Dict<{
//       name: string
//       selfId: string
//     }>
//   }> = {}
//   for (const message of messages.value) {
//     const outerId = message.guildId || message.selfId + '$'
//     const guild = guilds[message.platform + '/' + outerId] ||= {
//       name: message.guildId
//         ? message.guildName || '未知群组'
//         : `私聊 (${message.selfName})`,
//       channels: {},
//     }
//     guild.channels[message.channelId] ||= {
//       name: message.guildId
//         ? message.channelName || '未知频道'
//         : message.username,
//       selfId: message.selfId,
//     }
//   }
//   return guilds
// })

const header = computed(() => {
  if (!current.value) return
  return '122122'
  // const [platform, guildId, channelId] = current.value.split('/')
  // const guild = guilds.value[platform + '/' + guildId]
  // if (!guild) return
  // return `${guild.name} / ${guild.channels[channelId]?.name}`
})

const filtered = computed(() => {
  return messages.value[current.value] || []
})

function isSuccessive({ quoteId, userId, channelId }: Message, index: number) {
  const prev = filtered.value[index - 1]
  return !quoteId && !!prev && prev.userId === userId && prev.channelId === channelId
}

function handleSend(content: string) {
  if (!current.value) return
  const [platform, guildId, channelId] = current.value.split('/')
  // const { selfId } = channels.value[platform + '/' + guildId].channels[channelId]
  // send('chat', { content, platform, channelId, guildId, selfId })
}

</script>

<style lang="scss">

.page-chat {
  aside .el-scrollbar__view {
    padding: 1rem 0;
    line-height: 2.25rem;
  }

  main {
    display: flex;
    flex-direction: column;
  }

  .header-padding, .footer-padding {
    padding: 0.25rem 0;
  }

  .card-footer {
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--border);
  }
}

</style>
