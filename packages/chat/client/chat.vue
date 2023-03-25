<template>
  <k-layout class="page-chat">
    <template #header>
      {{ header }}
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

    <keep-alive>
      <template v-if="active" :key="active">
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

import { ChatInput, Dict, store, VirtualList } from '@koishijs/client'
import { computed, ref, watch } from 'vue'
import type { Message } from 'koishi-plugin-messages'
import { messages } from './utils'
import ChatMessage from './message.vue'

const index = ref<string>()
const active = ref<string>('')
const tree = ref(null)
const keyword = ref('')

watch(keyword, (val) => {
  tree.value?.filter(val)
})

interface Tree {
  id: string
  label: string
  children?: Tree[]
}

const data = computed(() => {
  const data: Tree[] = []
  const guilds: Dict<Tree> = {}
  for (const key in store.chat) {
    const [platform, guildId, channelId] = key.split('/')
    if (guildId === channelId) {
      data.push({
        id: key,
        label: store.chat[key].channelName || '未知频道',
      })
    } else {
      let guild = guilds[platform + '/' + guildId]
      if (!guild) {
        data.push(guild = guilds[platform + '/' + guildId] = {
          id: platform + '/' + guildId,
          label: store.chat[key].guildName || '未知群组',
          children: [],
        })
      }
      guild.children!.push({
        id: key,
        label: store.chat[key].channelName || '未知频道',
      })
    }
  }
  return data
})

const header = computed(() => {
  const channel = store.chat[active.value]
  if (!channel) return
  if (channel.channelId === channel.guildId) {
    return channel.channelName
  } else {
    return `${channel.guildName} / ${channel.channelName}`
  }
})

const filtered = computed(() => {
  return messages.value[active.value] || []
})

function filterNode(value: string, data: Tree) {
  return data.label.includes(keyword.value)
}

function handleClick(tree: Tree) {
  if (tree.children) return
  active.value = tree.id
}

function getClass(tree: Tree) {
  const words: string[] = []
  if (tree.id === active.value) words.push('is-active')
  return words.join(' ')
}

function isSuccessive({ quoteId, userId, channelId }: Message, index: number) {
  const prev = filtered.value[index - 1]
  return !quoteId && !!prev && prev.userId === userId && prev.channelId === channelId
}

function handleSend(content: string) {
  if (!active.value) return
  const [platform, guildId, channelId] = active.value.split('/')
  // const { selfId } = channels.value[platform + '/' + guildId].channels[channelId]
  // send('chat', { content, platform, channelId, guildId, selfId })
}

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

  .header-padding, .footer-padding {
    padding: 0.25rem 0;
  }

  .card-footer {
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--border);
  }
}

</style>
