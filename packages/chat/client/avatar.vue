<template>
  <img v-if="src" :src="withProxy(src)" class="b-rd-full select-none"/>
  <div v-else
    class="b-rd-full bg-gray-500
      font-bold text-18px select-none
      flex justify-center items-center">
    {{ name && short(name) }}
  </div>
</template>

<script setup lang="ts">

import { useRpc } from '@cordisjs/client'
import type { Login } from '@satorijs/protocol'
import getWidth from 'string-width'
import type { Data } from '../src'

const props = defineProps<{
  src?: string
  name?: string
  login: Login
}>()

const data = useRpc<Data>()

function withProxy(url: string) {
  if (!props.login.proxyUrls.some((proxy) => url.startsWith(proxy))) return url
  return data.value.serverUrl + '/v1/proxy/' + url
}

function short(name: string) {
  if (getWidth(name[0]) > 1) return name[0]
  return name.slice(0, 2)
}

</script>
