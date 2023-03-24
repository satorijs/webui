import { Context, Quester, Schema, segment } from 'koishi'
import { resolve } from 'path'
import {} from '@koishijs/plugin-console'
import {} from '@koishijs/assets'
import {} from 'koishi-plugin-messages'
import internal from 'stream'

interface ChatPayload {
  content: string
  platform: string
  channelId: string
  guildId: string
  selfId: string
}

declare module '@koishijs/plugin-console' {
  interface ClientConfig extends ClientExtension {}

  interface Events {
    chat(message: ChatPayload): Promise<void>
  }
}

interface ClientExtension {
  whitelist?: string[]
  maxMessages?: number
}

const builtinWhitelist = [
  'https://gchat.qpic.cn/',
  'https://c2cpicdw.qpic.cn/',
]

export const name = 'chat'

export const using = ['messages', 'console'] as const

export interface Config extends ClientExtension {}

export const Config: Schema<Config> = Schema.object({
  whitelist: Schema.array(String),
  maxMessages: Schema.natural().default(1000),
})

export function apply(ctx: Context, options: Config = {}) {
  const { apiPath } = ctx.console.config
  const whitelist = [...builtinWhitelist, ...options.whitelist || []]

  ctx.console.global.whitelist = whitelist
  ctx.console.global.maxMessages = options.maxMessages

  ctx.console.addEntry({
    dev: resolve(__dirname, '../client/index.ts'),
    prod: resolve(__dirname, '../dist'),
  })

  ctx.console.addListener('chat', async ({ content, platform, channelId, guildId, selfId }) => {
    if (ctx.assets) content = await ctx.assets.transform(content)
    ctx.bots[`${platform}:${selfId}`]?.sendMessage(channelId, content, guildId)
  }, { authority: 4 })

  ctx.on('chat/channel', (data, sync) => {
    ctx.console.broadcast('chat/channel', data, { authority: 4 })
  })

  ctx.on('chat/message', (messages, { data }) => {
    const id = `${data.platform}/${data.guildId}/${data.channelId}`
    for (const message of messages) {
      message.content = segment.transform(message.content, {
        image(data) {
          if (whitelist.some(prefix => data.url.startsWith(prefix))) {
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
    if (!whitelist.some(prefix => ctx.params.url.startsWith(prefix))) {
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
