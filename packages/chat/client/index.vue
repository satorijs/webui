<template>
  <k-layout>
    <template #left>
      <div class="header flex grow-0 shrink-0 box-border">
        <template v-if="guildKey">
          <div class="w-3rem h-full items-center justify-center flex
            bg-gray-700 bg-op-0 hover:bg-op-100 transition cursor-pointer"
            @click="guildKey = undefined, channels = []">
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
            bg-gray-700 bg-op-0 hover:bg-op-100 transition cursor-pointer">
          {{ channel.name }}
        </div>
      </el-scrollbar>
      <el-scrollbar v-else>
        <div v-for="(guild, key) in ctx.chat.guilds.value" :key="key"
          class="flex px-4 py-3 gap-x-4 justify-between
            bg-gray-700 bg-op-0 hover:bg-op-100 transition cursor-pointer"
          @click="onClickGuild(guild)"
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
  </k-layout>
</template>

<script lang="ts" setup>

import { onMounted, ref, computed, watch, reactive } from 'vue'
import { useContext, useRpc } from '@cordisjs/client'
import type { Data } from '../src'
import type { Universal } from '@satorijs/core'

const data = useRpc<Data>()
const ctx = useContext()

const guildKey = ref<string>()
const channels = ref<Universal.Channel[]>([])

function short(name: string) {
  return name.slice(0, 2)
}

function withProxy(url: string) {
  return (data.value.proxy ? data.value.proxy + '/' : '') + url
}

async function onClickGuild(guild: Universal.Guild & { platform: string; assignees: string[] }) {
  guildKey.value = `${guild.platform}/${guild.id}`
  channels.value = []
  for await (const channel of ctx.chat.logins[guild.assignees[0]].bot.getChannelIter(guild.id)) {
    channels.value.push(channel)
  }
}

</script>

<style lang="scss" scoped>

.header {
  height: var(--header-height);
  border-bottom: var(--k-color-divider-dark) 1px solid;
}

</style>
