import { Context, Dict, pick, Schema, Service, Session, Time } from 'koishi'
import { ChannelData, SyncChannel } from './channel'
import { Message } from './message'

export * from './channel'
export * from './message'

declare module 'koishi' {
  interface Tables {
    'chat.message': Message
  }

  interface Channel {
    name: string
    avatar: string
  }

  interface Context {
    messages: MessageService
  }

  interface Events {
    'chat/channel'(data: ChannelData, sync: SyncChannel): void
    'chat/message'(messages: Message[], sync: SyncChannel): void
  }
}

class MessageService extends Service {
  public stopped = false

  constructor(ctx: Context, config: MessageService.Config) {
    super(ctx, 'messages', true)

    this.ctx.model.extend('chat.message', {
      id: 'string',
      content: 'text',
      platform: 'string',
      guildId: 'string',
      messageId: 'string',
      userId: 'string',
      timestamp: 'timestamp',
      quoteId: 'string',
      username: 'string',
      nickname: 'string',
      channelId: 'string',
      selfId: 'string',
      lastUpdated: 'timestamp',
      deleted: 'integer',
      avatar: 'string',
    })

    this.ctx.model.extend('channel', {
      name: 'string',
      avatar: 'string',
    })
  }

  _channels: Dict<SyncChannel> = {}

  async start() {
    // 如果是一个 platform 有多个 bot, bot 状态变化, 频道状态变化待解决
    this.ctx.on('message', this.#onMessage.bind(this))

    this.ctx.on('send', async (session) => {
      const msg = await session.bot.getMessage(session.channelId, session.messageId)
      if (msg) {
        session.content = msg.content
      }
      await this.#onMessage(session)
    })

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

  async #onMessage(session: Session) {
    const channel = await this.ctx.database.getChannel(session.platform, session.channelId, ['assignee', 'name', 'avatar'])
    if (channel.assignee !== session.selfId) return
    let hasUpdate = false
    if (session.channelName && channel.name !== session.channelName) {
      hasUpdate = true
      channel.name = session.channelName
    }
    if (hasUpdate) this.ctx.database.setChannel(session.platform, session.channelId, pick(channel, ['name', 'avatar']))
    this._channels[session.cid] ||= new SyncChannel(this.ctx, session.platform, session.guildId, session.channelId)
    this._channels[session.cid].queue(session)
  }

  async getMessages(platform: string, channelId: string) {
    const cid = platform + ':' + channelId
    const channel = this._channels[cid]
    if (!channel) return []
    return channel.getMessages()
  }
}

namespace MessageService {
  export interface Config {
    maxAge?: number
  }

  export const Config: Schema<Config> = Schema.object({
    maxAge: Schema.number().role('time').description('消息最大保存时间，超过这个时间的消息将被删除。请注意：对于 sqlite 等数据库，请不要设置过大以免影响数据库性能。').default(Time.week),
  })
}

export default MessageService
