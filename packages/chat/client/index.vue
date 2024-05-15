<template>
  <k-layout>
    <template #left>
      <el-scrollbar>
        <div v-for="guild in data.guilds" :key="guild.id"
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
import { Universal } from '@satorijs/core'

const data = useRpc<Data>()
const ctx = useContext()

function short(name: string) {
  return name.slice(0, 2)
}

function withProxy(url: string) {
  return (data.value.proxy ? data.value.proxy + '/' : '') + url
}

async function onClickGuild(guild: Universal.Guild) {
  console.log(await ctx.get('satori')!.bots[0].getChannelList(guild.id))
}

</script>

<style lang="scss" scoped>

.el-scrollbar :deep(.el-scrollbar__view) {
  padding: 1rem 0;
}

</style>
