<template>
  <k-status v-if="data">
    <template #tooltip>
      <span v-if="!Object.values(data.bots).length" class="el-popper__empty"></span>
      <template v-for="(bot, key) in data.bots" :key="key">
        <bot-preview
          :data="bot"
          :class="{ 'has-link': bot.paths?.length }"
          @click="bot.paths && router.push('/plugins/' + bot.paths[0].replace(/\./, '/'))"
        ></bot-preview>
      </template>
    </template>
    <template v-for="(count, status) in statusMap" :key="status">
      <template v-if="count > (config.mergeThreshold ?? 10)">
        <status-light :class="status"></status-light>
        <span class="count">×{{ count }}</span>
      </template>
      <template v-else>
        <status-light v-for="(_, key) in Array(count)" :key="key" :class="status"></status-light>
      </template>
    </template>
    <k-icon name="arrow-up"/>
    <span>{{ sent }}/min</span>
    <k-icon name="arrow-down"/>
    <span>{{ received }}/min</span>
  </k-status>
</template>

<script setup lang="ts">

import { computed } from 'vue'
import { router, Dict, useConfig, useRpc } from '@cordisjs/client'
import { getStatus } from './utils'
import BotPreview from './preview.vue'
import StatusLight from './light.vue'
import { Data } from '../../src'

const config = useConfig()
const data = useRpc<Data>()

const statusMap = computed(() => {
  const map: Dict<number> = {}
  for (const bot of Object.values(data.value.bots)) {
    const key = getStatus(bot.status)
    map[key] = (map[key] || 0) + 1
  }
  return Object.fromEntries(Object.entries(map)
    .sort((a, b) => a[0].localeCompare(b[0])))
})

const sent = computed(() => {
  return Object.values(data.value.bots).reduce((acc, bot) => acc + bot.messageSent, 0)
})

const received = computed(() => {
  return Object.values(data.value.bots).reduce((acc, bot) => acc + bot.messageReceived, 0)
})

</script>

<style lang="scss" scoped>

.k-status {
  .k-icon {
    margin-right: 4px;
  }

  * + .k-icon {
    margin-left: 6px;
  }

  .count {
    margin: 0 4px 0 4px;
    letter-spacing: 1px;
  }
}

</style>
