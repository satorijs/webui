import { Context, Dict, Quester, Schema, segment, valueMap } from 'koishi'
import { resolve } from 'path'
import { DataService } from '@koishijs/plugin-console'
import { ChannelData } from 'koishi-plugin-messages'
import {} from '@koishijs/assets'
import internal from 'stream'

interface SendPayload {
  content: string
  platform: string
  channelId: string
  guildId: string
  selfId: string
}

interface HistoryPayload {
  platform: string
  channelId: string
  guildId: string
  messageId?: string
}

declare module '@koishijs/plugin-console' {
  namespace Console {
    interface Services {
      chat: ChatService
    }
  }

  interface Events {
    'chat/send'(payload: SendPayload): Promise<void>
    'chat/history'(payload: HistoryPayload): Promise<void>
  }
}

class ChatService extends DataService<Dict<ChannelData>> {
  constructor(ctx: Context, private config: ChatService.Config) {
    super(ctx, 'chat')
    const { apiPath } = ctx.console.config

    ctx.console.addEntry({
      dev: resolve(__dirname, '../client/index.ts'),
      prod: resolve(__dirname, '../dist'),
    })

    ctx.console.addListener('chat/send', async ({ content, platform, channelId, guildId, selfId }) => {
      if (ctx.assets) content = await ctx.assets.transform(content)
      ctx.bots[`${platform}:${selfId}`]?.sendMessage(channelId, content, guildId)
    }, { authority: 4 })

    // ctx.console.addListener('chat/history', async ({ platform, channelId, guildId, messageId }) => {
    //   ctx.messages._channels[`${platform}:${channelId}`]?.init(messageId)
    // }, { authority: 4 })

    ctx.on('chat/channel', (sync) => {
      this.refresh()
    })

    ctx.on('chat/message', (messages, { data }) => {
      const id = `${data.platform}/${data.guildId}/${data.channelId}`
      for (const message of messages) {
        message.content = segment.transform(message.content, {
          image(data) {
            if (config.whitelist.some(prefix => data.url.startsWith(prefix))) {
              data.url = apiPath + '/proxy/' + encodeURIComponent(data.url)
            }
            return segment('image', data)
          },
        })
      }
      ctx.console.broadcast('chat/message', { id, messages }, { authority: 4 })
    })

    const { get } = ctx.http
    ctx.router.get(apiPath + '/proxy/:url', async (ctx) => {
      if (!config.whitelist.some(prefix => ctx.params.url.startsWith(prefix))) {
        return ctx.status = 403
      }
      try {
        ctx.body = await get<internal.Readable>(ctx.params.url, { responseType: 'stream' })
      } catch (error) {
        if (!Quester.isAxiosError(error) || !error.response) throw error
        ctx.status = error.response.status
        ctx.body = error.response.data
      }
    })
  }

  async get() {
    return valueMap(this.ctx.messages._channels, sync => sync.data)
  }
}

namespace ChatService {
  export const using = ['messages', 'console'] as const

  export interface Config {
    whitelist?: string[]
  }

  export const Config: Schema<Config> = Schema.object({
    whitelist: Schema.array(String).default([
      'https://gchat.qpic.cn/',
      'https://c2cpicdw.qpic.cn/',
    ]),
  })
}

export default ChatService
