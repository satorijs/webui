<template>
  <k-layout>
    <template #left>
      <div class="flex px-4 py-2 gap-x-4 justify-between" v-for="guild in data.guilds" :key="guild.id">
        <img class="b-rd-full" :src="guild.avatar" width="48" height="48"/>
        <div class="flex flex-col flex-1">
          <div>{{ guild.name }}</div>
          <div>{{ guild.id }}</div>
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
