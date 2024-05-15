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
      </div>
    </template>
  </k-layout>
</template>

<script lang="ts" setup>

import { onMounted, ref, computed, watch, reactive } from 'vue'
import { useRpc } from '@cordisjs/client'
import type { Data } from '../src'

const data = useRpc<Data>()

</script>

<style lang="scss" scoped>

</style>
