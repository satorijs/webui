import { Bot, Context, Dict, Schema, Service, Session, Time, valueMap } from 'koishi'
import { SyncChannel } from './channel'
import { SyncGuild } from './guild'
import { Message } from './message'

export * from './channel'
export * from './message'

declare module 'koishi' {
  interface Tables {
    'chat.message': Message
  }

  interface Context {
    messages: MessageService
  }

  interface Events {
    'chat/update'(): void
    'chat/message'(messages: Message[], channel: SyncChannel): void
  }
}

class MessageService extends Service {
  public stopped = false

  constructor(ctx: Context, public config: MessageService.Config) {
    super(ctx, 'messages', true)

    this.ctx.model.extend('chat.message', {
      id: 'string',
      content: 'text',
      platform: 'string',
      messageId: 'string',
      userId: 'string',
      timestamp: 'timestamp',
      quoteId: 'string',
      username: 'string',
      nickname: 'string',
      channelId: 'string',
      lastUpdated: 'timestamp',
      deleted: 'integer',
      avatar: 'string',
    })
  }

  _channels: Dict<SyncChannel> = {}
  _guilds: Dict<SyncGuild> = {}

  async start() {
    // 如果是一个 platform 有多个 bot, bot 状态变化, 频道状态变化待解决
    this.ctx.on('message', this.#onMessage.bind(this))

    // this.ctx.on('send', async (session) => {
    //   const msg = await session.bot.getMessage(session.channelId, session.messageId)
    //   if (msg) {
    //     session.content = msg.content
    //   }
    //   await this.#onMessage(session)
    // })

    this.ctx.on('message-deleted', async (session) => {
      await this.ctx.database.set('chat.message', {
        messageId: session.messageId,
        platform: session.platform,
      }, {
        deleted: 1,
        lastUpdated: new Date(),
      })
    })

    this.ctx.on('message-updated', async (session) => {
      await this.ctx.database.set('chat.message', {
        messageId: session.messageId,
        platform: session.platform,
      }, {
        content: session.content,
        lastUpdated: new Date(),
      })
    })

    this.ctx.on('bot-status-updated', async (bot) => {
      this.onBotOnline(bot)
    })

    this.ctx.bots.forEach(async (bot) => {
      this.onBotOnline(bot)
    })

    // channel updated: 如果在队列内, 打断同步, 停止记录后续消息
    // this.ctx.on('channel-updated', async (session) => {
    //   if (this.inSyncQueue(session.cid)) {
    //     logger.debug('in queue, removed, cid: %s', session.cid)
    //     this.removeFromSyncQueue(session.platform + ':' + session.channelId)
    //   }
    // })

    // guild added: 如果 guildId 和 channelId 相同, 加入同步队列
    // this.ctx.on('guild-added', async (session) => {
    //   if (session.channelId === session.guildId) {
    //     if (this.#status[session.cid] === SyncStatus.SYNCED) {
    //       logger.debug('guild added, addToSyncQueue, cid: %s', session.cid)
    //       this.addToSyncQueue(session.bot, session.guildId, session.channelId)
    //     }
    //   }
    // })
  }

  async stop() {
    this.stopped = true
  }

  private async onBotOnline(bot: Bot) {
    if (bot.status !== 'online' || bot.hidden || !bot.getMessageList || !bot.getGuildList) return
    const tasks: Promise<any>[] = []
    for await (const guild of bot.getGuildIter()) {
      const key = bot.platform + '/' + guild.id
      this._guilds[key] ||= new SyncGuild()
      tasks.push((async () => {
        for await (const channel of bot.getChannelIter(guild.id)) {
          const key = bot.platform + '/' + guild.id + '/' + channel.id
          this._channels[key] ||= new SyncChannel(this.ctx, bot.platform, guild.id, channel.id)
          this._channels[key].data.assignee = bot.selfId
          this._channels[key].data.guildName = guild.name
          this._channels[key].data.channelName = channel.name
        }
      })())
    }
    this.ctx.emit('chat/update')
  }

  async #onMessage(session: Session) {
    const { platform, guildId, channelId } = session
    if (session.bot.hidden) return
    const key = platform + '/' + guildId + '/' + channelId
    this._channels[key] ||= new SyncChannel(this.ctx, platform, guildId, channelId)
    this._channels[key].queue(session)
  }

  async channel(platform: string, guildId: string, channelId: string) {
    const key = platform + '/' + guildId + '/' + channelId
    const channel = this._channels[key]
    if (channel) return channel
    this._channels[key] = new SyncChannel(this.ctx, platform, guildId, channelId)
    await this._channels[key].init()
    return this._channels[key]
  }

  toJSON(): MessageService.Data {
    return {
      channels: valueMap(this._channels, sync => sync.toJSON()),
      guilds: valueMap(this._guilds, sync => sync.toJSON()),
    }
  }
}

namespace MessageService {
  export interface Data {
    channels: Dict<SyncChannel.Data>
    guilds: Dict<SyncGuild.Data>
  }

  export interface Config {
    maxAge?: number
  }

  export const Config: Schema<Config> = Schema.object({
    maxAge: Schema.number().role('time').description('消息最大保存时间，超过这个时间的消息将被删除。请注意：对于 sqlite 等数据库，请不要设置过大以免影响数据库性能。').default(Time.week),
  })
}

export default MessageService
