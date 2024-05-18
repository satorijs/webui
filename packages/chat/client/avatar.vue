<template>
  <img v-if="src" :src="withProxy(src)" class="b-rd-full select-none"/>
  <div v-else
    class="b-rd-full bg-gray-500
      font-bolder text-18px select-none
      flex justify-center items-center">
    {{ name && short(name) }}
  </div>
</template>

<script setup lang="ts">

import { useRpc } from '@cordisjs/client'
import getWidth from 'string-width'
import type { Data } from '../src'

defineProps<{
  src?: string
  name?: string
}>()

const data = useRpc<Data>()

function withProxy(url: string) {
  return (data.value.proxy ? data.value.proxy + '/' : '') + url
}

function short(name: string) {
  if (getWidth(name[0]) > 1) return name[0]
  return name.slice(0, 2)
}

</script>
