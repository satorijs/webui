<template>
  <k-layout>
    <template #left>
      <div class="header flex grow-0 shrink-0 box-border">
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
        >
          {{ channel.name }}
        </div>
      </el-scrollbar>
      <el-scrollbar v-else>
        <div v-for="(guild, key) in ctx.chat.guilds.value" :key="key"
          class="flex px-4 py-3 gap-x-4 justify-between
            bg-gray-700 bg-op-0 hover:bg-op-100 transition cursor-pointer"
          @click="setGuild(guild)"
        >
          <img v-if="guild.avatar" :src="withProxy(guild.avatar)" width="48" height="48" class="b-rd-full"/>
          <div v-else
            class="w-48px h-48px b-rd-full bg-gray-500
              font-bolder text-18px
              flex justify-center items-center">
            {{ short(guild.name!) }}
          </div>
          <div class="flex flex-col flex-1">
            <div>{{ guild.name }}</div>
            <div>{{ guild.id }}</div>
          </div>
        </div>
      </el-scrollbar>
    </template>

    <template v-if="channelId">
      <el-scrollbar>
        <div v-for="message in messages" :key="message.id" class="message">
          <message-content :content="message.content!"></message-content>
        </div>
      </el-scrollbar>
      <div class="footer shrink-0">
        <chat-input class="h-6 px-4 py-2" v-model="input" @send="handleSend" placeholder="发送消息"></chat-input>
      </div>
    </template>
    <template v-else>
      <k-empty>选择一个频道开始聊天</k-empty>
    </template>
  </k-layout>
</template>

<script lang="ts" setup>

import { ref } from 'vue'
import { useContext, useRpc } from '@cordisjs/client'
import type { Data } from '../src'
import { Universal } from '@satorijs/core'
import { ChatInput, MessageContent } from '@satorijs/components-vue'

const data = useRpc<Data>()
const ctx = useContext()

const platform = ref<string>()
const guildKey = ref<string>()
const channelId = ref<string>()
const channels = ref<Universal.Channel[]>([])
const messages = ref<Universal.Message[]>([])

const input = ref('')

function short(name: string) {
  return name.slice(0, 2)
}

function withProxy(url: string) {
  return (data.value.proxy ? data.value.proxy + '/' : '') + url
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

async function setChannel(channel: Universal.Channel) {
  channelId.value = channel.id
  messages.value = []
  for await (const message of ctx.bots[ctx.chat.guilds.value[guildKey.value!].assignees[0]].getMessageIter(channel.id)) {
    if (channelId.value !== channel.id || messages.value.length >= 100) return
    messages.value.unshift(message)
  }
}

function handleSend(content: string) {
  return ctx.bots[ctx.chat.guilds.value[guildKey.value!].assignees[0]].sendMessage(channelId.value!, content)
}

</script>

<style lang="scss" scoped>

.header {
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
