<template>
  <div class="member-view">
    <div class="left">
      <img v-if="avatar" class="avatar" :src="avatar"/>
    </div>
    <div class="right">
      {{ name }}
    </div>
  </div>
</template>

<script setup lang="ts">

import type { Universal } from 'koishi'
import { computed } from 'vue'

const props = defineProps<{
  data: Universal.GuildMember
}>()

const avatar = computed(() => props.data.avatar || props.data.user.avatar)
const name = computed(() => props.data.name || props.data.user.name)

</script>

<style lang="scss" scoped>

$avatar-size: 2rem;

.member-view {
  display: flex;
  padding: 0.5rem 1rem;
  height: $avatar-size;
  overflow: hidden;
  align-items: center;
  gap: 0 1rem;
  user-select: none;
}

.left, .right {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.left {
  width: $avatar-size;
}

.avatar {
  height: $avatar-size;
  width: $avatar-size;
  border-radius: 100%;
}

</style>
