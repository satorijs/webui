<template>
  <k-layout class="page-chat">
    <template #header>
      {{ title }}
    </template>

    <template #left>
      <el-scrollbar>
        <div class="search">
          <el-input v-model="keyword" #suffix>
            <k-icon name="search"></k-icon>
          </el-input>
        </div>
        <el-tree
          ref="tree"
          :data="data"
          :props="{ class: getClass }"
          :filter-node-method="filterNode"
          :default-expand-all="true"
          @node-click="handleClick"
        ></el-tree>
      </el-scrollbar>
    </template>

    <template #right v-if="members[activeGuild]">
      <virtual-list class="members" :data="members[activeGuild].data" pinned key-name="user.id">
        <template #header>
          <div ref="header" class="header-padding">
            <div class="header-title">成员列表 ({{ members[activeGuild].next ? '加载中' : members[activeGuild].data.length }})</div>
          </div>
        </template>
        <template #="data">
          <member-view :data="data"></member-view>
        </template>
        <template #footer><div class="footer-padding"></div></template>
      </virtual-list>
    </template>

    <keep-alive>
      <template v-if="activeChannel" :key="activeChannel">
        <virtual-list class="messages" :data="messages[activeChannel]" pinned v-model:activeChannel-key="index" key-name="messageId">
          <template #header><div ref="header" class="header-padding"></div></template>
          <template #="data">
            <chat-message :successive="isSuccessive(data, data.index)" :data="data"></chat-message>
          </template>
          <template #footer><div class="footer-padding"></div></template>
        </virtual-list>
        <div class="card-footer">
          <chat-input v-model="input" @send="handleSend" placeholder="向频道发送消息"></chat-input>
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

import { ChatInput, Dict, send, store, VirtualList } from '@koishijs/client'
import { computed, ref, watch } from 'vue'
import { useIntersectionObserver } from '@vueuse/core'
import type { Message, SyncChannel } from 'koishi-plugin-messages'
import {} from 'koishi-plugin-chat'
import { messages, members } from './utils'
import MemberView from './member.vue'
import ChatMessage from './message.vue'

const index = ref<string>()
const activeChannel = ref<string>('')
const activeGuild = ref<string>('')
const tree = ref(null)
const header = ref(null)
const keyword = ref('')
const input = ref('')

watch(keyword, (val) => {
  tree.value?.filter(val)
})

interface Tree {
  id: string
  label: string
  children?: Tree[]
  data?: SyncChannel.Data
}

const data = computed(() => {
  const data: Tree[] = []
  const guilds: Dict<Tree> = {}
  for (const key in store.chat.channels) {
    const [platform, guildId, channelId] = key.split('/')
    if (guildId === channelId) {
      data.push({
        id: key,
        label: store.chat.channels[key].channelName || '未知频道',
        data: store.chat.channels[key],
      })
    } else {
      let guild = guilds[platform + '/' + guildId]
      if (!guild) {
        data.push(guild = guilds[platform + '/' + guildId] = {
          id: platform + '/' + guildId,
          label: store.chat.channels[key].guildName || '未知群组',
          children: [],
        })
      }
      guild.children!.push({
        id: key,
        label: store.chat.channels[key].channelName || '未知频道',
        data: store.chat.channels[key],
      })
    }
  }
  return data
})

const title = computed(() => {
  const channel = store.chat.channels[activeChannel.value]
  if (!channel) return
  if (channel.channelId === channel.guildId) {
    return channel.channelName
  } else {
    return `${channel.guildName} / ${channel.channelName}`
  }
})

function filterNode(value: string, data: Tree) {
  return data.label.includes(keyword.value)
}

function handleClick(tree: Tree) {
  if (tree.children) return
  activeChannel.value = tree.id
  activeGuild.value = tree.data!.guildId
  const list = messages.value[tree.id] ||= []
  if (list.length <= 100) {
    send('chat/history', {
      platform: tree.data!.platform,
      guildId: tree.data!.guildId,
      channelId: tree.data!.channelId,
      id: list[0]?.id,
    })
  }
}

function getClass(tree: Tree) {
  const words: string[] = []
  if (tree.id === activeChannel.value) words.push('is-activeChannel')
  return words.join(' ')
}

function isSuccessive({ quoteId, userId, channelId, username }: Message, index: number) {
  const prev = (messages.value[activeChannel.value] ||= [])[index - 1]
  return !quoteId && !!prev
    && prev.userId === userId
    && prev.channelId === channelId
    && prev.username === username
}

function handleSend(content: string) {
  if (!activeChannel.value) return
  const [platform, guildId, channelId] = activeChannel.value.split('/')
  send('chat/send', { content, platform, channelId, guildId })
}

let task: Promise<void> = null

useIntersectionObserver(header, ([{ isIntersecting }]) => {
  if (!isIntersecting || task) return
  task = send('chat/history', {
    platform: store.chat.channels[activeChannel.value].platform,
    guildId: store.chat.channels[activeChannel.value].guildId,
    channelId: store.chat.channels[activeChannel.value].channelId,
    id: messages.value[activeChannel.value][0]?.id,
  })
  task.then(() => task = null)
})

watch(() => store.chat.channels[activeChannel.value]?.guildId, async (guildId) => {
  if (!guildId) return
  members.value[guildId] = await send('chat/members', store.chat.channels[activeChannel.value].platform, guildId)
})

</script>

<style lang="scss">

.page-chat {
  .layout-left .el-scrollbar__view {
    padding: 1rem 0;
  }

  .search {
    padding: 0 1.5rem;
  }

  main {
    display: flex;
    flex-direction: column;
  }

  .messages {
    .header-padding, .footer-padding {
      padding: 0.25rem 0;
    }
  }

  .members {
    .header-padding, .footer-padding {
      padding: 0.5rem 1rem;
    }
  }

  .card-footer {
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--k-color-border);
  }
}

</style>
