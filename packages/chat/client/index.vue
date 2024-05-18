<template>
  <k-layout :title="channelName || '聊天'">
    <template #left>
      <div class="layout-left-header flex grow-0 shrink-0 box-border">
        <template v-if="guildKey">
          <div class="w-3rem h-full items-center justify-center flex
            bg-gray-700 bg-op-0 hover:bg-op-100 transition cursor-pointer"
            @click="setGuild()">
            <k-icon name="arrow-left" class="h-4"></k-icon>
          </div>
          <div class="font-bold flex items-center flex-1">{{ ctx.chat.guilds.value[guildKey].name }}</div>
        </template>
        <template v-else>
          <div class="font-bold flex items-center flex-1 justify-center">消息列表</div>
        </template>
      </div>

      <el-scrollbar v-if="guildKey">
        <div v-for="(channel, index) in channels" :key="channel.id"
          class="flex px-4 py-1 items-center
            bg-gray-700 bg-op-0 hover:bg-op-100 transition cursor-pointer"
          @click="setChannel(channel)"
          @contextmenu.stop="triggerChannel($event, channel)"
        >
          {{ channel.name }}
        </div>
      </el-scrollbar>
      <el-scrollbar v-else>
        <div v-for="(guild, key) in ctx.chat.guilds.value" :key="key"
          class="flex px-4 py-3 gap-x-4 justify-between
            bg-gray-700 bg-op-0 hover:bg-op-100 transition cursor-pointer"
          @click="setGuild(guild)"
          @contextmenu.stop="triggerGuild($event, guild)"
        >
          <avatar :src="guild.avatar" :name="guild.name" class="w-48px h-48px"/>
          <div class="flex flex-col flex-1">
            <div>{{ guild.name }}</div>
            <div>{{ guild.id }}</div>
          </div>
        </div>
      </el-scrollbar>
    </template>

    <template v-if="channelId">
      <el-scrollbar>
        <div ref="header" v-if="messages?.prev"
          class="items-center flex justify-center py-2
          bg-gray-700 bg-op-0 hover:bg-op-100 transition cursor-pointer"
          @click="appendHeader"
        >正在加载更多消息……</div>
        <div v-for="(message, index) in messages?.data" :key="message.id"
          class="relative px-4 py-0 break-words last:mb-2
            bg-gray-700 bg-op-0 hover:bg-op-100 transition"
          :class="{ 'mt-2': !isSuccessive(index) }"
          @contextmenu.stop="triggerMessage($event, message)">
          <div class="quote" v-if="message.quote">
            {{ message.quote }}
          </div>
          <template v-if="isSuccessive(index)">
            <span>{{ formatTime(new Date(message?.createdAt!)) }}</span>
          </template>
          <template v-else>
            <avatar :src="message.user?.avatar" :name="message.user?.name"
              class="w-10 h-10 absolute mt-1.5"/>
            <div class="header">
              <span class="font-bold lh-relaxed ml-14">{{ message.user?.name }}</span>
              <span>{{ formatDateTime(new Date(message?.createdAt!)) }}</span>
            </div>
          </template>
          <message-content :content="message.content!"
            class="ml-14 lh-relaxed"
          ></message-content>
        </div>
        <div ref="footer" v-if="messages?.next"
          class="items-center flex justify-center py-2
          bg-gray-700 bg-op-0 hover:bg-op-100 transition cursor-pointer"
          @click="appendFooter"
        >正在加载更多消息……</div>
      </el-scrollbar>
      <div class="footer shrink-0">
        <chat-input class="h-6 px-4 py-2" v-model="input" @send="handleSend" placeholder="发送消息"></chat-input>
      </div>
    </template>
    <template v-else>
      <k-empty>选择一个频道开始聊天</k-empty>
    </template>
  </k-layout>

  <el-dialog
    title="群组信息"
    :model-value="!!showGuild"
    @update:model-value="showGuild = undefined"
    destroy-on-close>
    <ul v-if="showGuild">
      <li>群组 ID: {{ showGuild.id }}</li>
      <li>群组名称: {{ showGuild.name }}</li>
    </ul>
  </el-dialog>

  <el-dialog
    title="频道信息"
    :model-value="!!showChannel"
    @update:model-value="showChannel = undefined"
    destroy-on-close>
    <ul v-if="showChannel">
      <li>频道 ID: {{ showChannel.id }}</li>
      <li>频道名称: {{ showChannel.name }}</li>
    </ul>
  </el-dialog>

  <el-dialog
    title="消息信息"
    :model-value="!!showMessage"
    @update:model-value="showMessage = undefined"
    destroy-on-close>
    <ul v-if="showMessage">
      <li>消息 ID: {{ showMessage.id }}</li>
    </ul>
  </el-dialog>
</template>

<script lang="ts" setup>

import { ref } from 'vue'
import { useContext, useMenu } from '@cordisjs/client'
import { useIntersectionObserver } from '@vueuse/core'
import { Universal } from '@satorijs/core'
import { ChatInput, MessageContent } from '@satorijs/components-vue'
import Avatar from './avatar.vue'

const ctx = useContext()

const platform = ref<string>()
const guildKey = ref<string>()
const channelId = ref<string>()
const channelName = ref<string>()
const channels = ref<Universal.Channel[]>([])
const messages = ref<Universal.TwoWayList<Universal.Message>>()

const input = ref('')
const header = ref<HTMLDivElement>()
const footer = ref<HTMLDivElement>()

const showGuild = ref<Universal.Guild>()
const showChannel = ref<Universal.Channel>()
const showMessage = ref<Universal.Message>()

const triggerGuild = useMenu('chat.guild')
const triggerChannel = useMenu('chat.channel')
const triggerMessage = useMenu('chat.message')

ctx.action('chat.guild.inspect', async ({ chat }) => {
  showGuild.value = chat.guild
})

ctx.action('chat.channel.inspect', async ({ chat }) => {
  showChannel.value = chat.channel
})

ctx.action('chat.message.inspect', async ({ chat }) => {
  showMessage.value = chat.message
})

function isSuccessive(index: number) {
  const curr = messages.value?.data[index]
  const prev = messages.value?.data[index - 1]
  return curr && prev && !curr.quote && curr.user?.id === prev.user?.id
}

async function setGuild(guild?: Universal.Guild & { platform: string; assignees: string[] }) {
  channels.value = []
  channelId.value = undefined
  if (!guild) return guildKey.value = undefined
  platform.value = guild.platform
  guildKey.value = `${guild.platform}/${guild.id}`
  for await (const channel of ctx.bots[guild.assignees[0]].getChannelIter(guild.id)) {
    channels.value.push(channel)
  }
}

function useBot() {
  return ctx.bots[ctx.chat.guilds.value[guildKey.value!].assignees[0]]
}

async function setChannel(channel: Universal.Channel) {
  channelId.value = channel.id
  messages.value = undefined
  const result = await useBot().getMessageList(channel.id)
  result.next = undefined
  if (channelId.value !== channel.id) return
  messages.value = result
}

let headerTask: Promise<void> | undefined

function appendHeader() {
  if (headerTask) return
  const id = channelId.value!
  headerTask = useBot().getMessageList(id, messages.value!.prev, 'before').then((result) => {
    headerTask = undefined
    if (channelId.value !== id) return
    messages.value!.data.unshift(...result.data)
    messages.value!.prev = result.prev
  })
}

let footerTask: Promise<void> | undefined

function appendFooter() {
  if (footerTask) return
  const id = channelId.value!
  footerTask = useBot().getMessageList(id, messages.value!.next, 'after').then((result) => {
    footerTask = undefined
    if (channelId.value !== id) return
    messages.value!.data.push(...result.data)
    messages.value!.next = result.next
  })
}

function handleSend(content: string) {
  return useBot().sendMessage(channelId.value!, content)
}

function formatTime(date: Date) {
  if (Number.isNaN(+date)) return ''
  return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
}

function formatDateTime(date: Date) {
  if (Number.isNaN(+date)) return ''
  const now = new Date()
  const time = formatTime(date)
  if (date.toLocaleDateString() === now.toLocaleDateString()) {
    return time
  }
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${time}`
}

</script>

<style lang="scss" scoped>

.layout-left-header {
  height: var(--header-height);
  border-bottom: var(--k-color-divider-dark) 1px solid;
}

.k-layout :deep(main) {
  display: flex;
  flex-direction: column;
}

.footer {
  border-top: var(--k-color-divider-dark) 1px solid;
}

</style>
