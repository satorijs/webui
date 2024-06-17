<template>
  <template v-if="bots?.length">
    <h2 class="k-schema-header">
      登录号
    </h2>
    <div class="bots-container flex flex-wrap gap-4">
      <bot-preview v-for="(bot, sid) in bots" :key="sid" :bot="bot"/>
    </div>
  </template>
</template>

<script setup lang="ts">

import { useContext, useRpc } from '@cordisjs/client'
import { computed } from 'vue'
import {} from '@cordisjs/plugin-manager/client'
import BotPreview from './bots/preview.vue'
import { Data } from '../src'

const ctx = useContext()
const data = useRpc<Data>()

const bots = computed(() => {
  return Object.values(data.value.bots || {}).filter(bot => {
    return bot.paths?.includes(ctx.manager!.currentEntry!.id)
  })
})

</script>

<style scoped lang="scss">

.bots-container {
  .bot-view {
    background-color: var(--bg0);
    border-radius: 0.5rem;
  }
}

</style>
