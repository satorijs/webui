<template>
  <section class="bot-view">
    <!-- FIXME avatar may be absent -->
    <div class="avatar" :style="{ backgroundImage: `url(${withProxy(bot.user!.avatar!)})` }" @click="$emit('avatar-click')">
      <el-tooltip :content="statusNames[bot.status]" placement="right">
        <status-light :class="getStatus(bot.status)"></status-light>
      </el-tooltip>
    </div>
    <div class="info">
      <div class="truncate" :title="bot.user!.name"><k-icon name="robot"/>{{ bot.user!.name }}</div>
      <div class="truncate" :title="bot.platform"><k-icon name="platform"/>{{ bot.platform }}</div>
      <div class="truncate cur-frequency">
        <span style="margin-right: 8px">
          <k-icon name="arrow-up"/>
          <span>{{ bot.messageSent }}/min</span>
        </span>
        <span>
          <k-icon name="arrow-down"/>
          <span>{{ bot.messageReceived }}/min</span>
        </span>
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>

import { Status } from '@satorijs/protocol'
import { useRpc } from '@cordisjs/client'
import type { Data } from '../../src'
import { getStatus } from './utils'
import StatusLight from './light.vue'

const statusNames: Record<Status, string> = {
  [Status.ONLINE]: '运行中',
  [Status.OFFLINE]: '离线',
  [Status.CONNECT]: '正在连接',
  [Status.RECONNECT]: '正在重连',
  [Status.DISCONNECT]: '正在断开',
}

defineProps<{
  bot: Data.Bot
}>()

const data = useRpc<Data>()

function withProxy(url: string) {
  return (data.value.proxy ? data.value.proxy + '/' : '') + url
}

</script>

<style scoped lang="scss">

.bot-view {
  width: 15rem;
  padding: 0.75rem 1rem;
  font-size: 14px;
  display: flex;
  transition: 0.3s ease;

  & + & {
    border-top: 1px solid var(--k-color-divider);
  }

  &.active {
    > div.avatar {
      border-color: var(--active);
    }
  }

  > div.avatar {
    position: relative;
    width: 4rem;
    height: 4rem;
    box-sizing: content-box;
    border: 1px solid var(--k-color-divider);
    transition: border 0.3s ease;
    border-radius: 100%;
    background-size: 100%;
    background-repeat: no-repeat;
    transition: 0.1s ease;
    flex-shrink: 0;

    $borderWidth: 1px;

    .status-light {
      position: absolute;
      bottom: -$borderWidth;
      right: -$borderWidth;
      width: 0.875rem;
      height: 0.875rem;
      border: $borderWidth solid var(--k-color-divider);
    }
  }

  > div.info {
    flex-grow: 1;
    margin-left: 1.25rem;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    overflow: hidden;

    .k-icon {
      width: 20px;
      margin-right: 6px;
      text-align: center;
      vertical-align: -2px;
    }
  }

  &.has-link {
    cursor: pointer;
    &:hover {
      background-color: var(--bg1);
    }
  }
}

</style>
