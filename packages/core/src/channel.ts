import { Context, Logger, pick, Session } from 'koishi'
import { Message } from './message'

const logger = new Logger('chat')

export enum SyncStatus {
  SYNCING,
  SYNCED,
  FAILED,
}

export class SyncChannel {
  public data: SyncChannel.Data
  public status = SyncStatus.SYNCING
  private _buffer: Message[] = []
  private _initTask: Promise<void>
  private _queueTask = Promise.resolve()

  constructor(private ctx: Context, platform: string, guildId: string, channelId: string) {
    this.data = { platform, guildId, channelId }
  }

  accept(session: Session) {
    if (!this.data.assignee) {
      this.data.assignee = session.selfId
    } else if (this.data.assignee !== session.selfId) {
      return true
    }

    if (session.event.channel?.name) {
      this.data.channelName = session.event.channel.name
    }
  }

  async queue(session: Session) {
    if (this.accept(session)) return
    this._buffer.push(Message.fromSession(session))
    this.ensure(async () => {
      if (this.status === SyncStatus.SYNCING) {
        await this.init(session)
      }
      if (this.status === SyncStatus.SYNCED) {
        return this._queueTask = this._queueTask.then(() => this.flush())
      }
    })
  }

  async ensure<T>(callback: () => Promise<T>) {
    if (this.status === SyncStatus.FAILED) return
    if (this.ctx.messages.stopped) return
    try {
      return await callback()
    } catch (error) {
      logger.warn(error)
      this.status = SyncStatus.FAILED
    }
  }

  async syncHistory(rear: string, next?: string) {
    const { channelId, platform, assignee } = this.data
    logger.debug('[history] platform=%s channel=%s %s->%s', platform, channelId, rear, next)
    const bot = this.ctx.bots[`${platform}:${assignee}`]
    outer: while (true) {
      const { data } = await bot.getMessageList(channelId, next)
      next = data[0].id
      for (const message of data.reverse()) {
        if (message.id === rear) {
          // eslint-disable-next-line no-labels
          break outer
        } else {
          this._buffer.unshift(Message.fromUniversal(message, platform))
        }
      }
    }
    await this.flush()
  }

  async adapt(buffer: Message[]) {
    await this.ctx.database.upsert('chat.message', buffer.filter(message => {
      return Date.now() - +message.timestamp < this.ctx.messages.config.maxAge
    }))
    return buffer
  }

  async getHistory(count: number, next?: string) {
    const { channelId, platform, assignee } = this.data
    logger.debug('[history] platform=%s channel=%s (%s)->%s', platform, channelId, count, next)
    const bot = this.ctx.bots[`${platform}:${assignee}`]
    const buffer: Message[] = []
    while (true) {
      const { data } = await bot.getMessageList(channelId, next)
      buffer.push(...data.map(message => Message.fromUniversal(message, platform)))
      if (data.length === 0 || buffer.length >= count) {
        break
      }
      next = data[0].id
    }
    return this.adapt(buffer.reverse())
  }

  init(session?: Session) {
    return this._initTask ||= this._init(session)
  }

  private async _init(session?: Session) {
    logger.debug('init channel %s %s %s', this.data.platform, this.data.guildId, this.data.channelId)
    const [[initial], [final]] = await Promise.all([
      this.ctx.database
        .select('chat.message')
        .where(pick(this.data, ['platform', 'channelId']))
        .orderBy('id', 'asc')
        .limit(1)
        .execute(),
      this.ctx.database
        .select('chat.message')
        .where(pick(this.data, ['platform', 'channelId']))
        .orderBy('id', 'desc')
        .limit(1)
        .execute(),
    ])
    if (final) {
      await this.syncHistory(final.messageId, session?.messageId)
    }
    this.status = SyncStatus.SYNCED
    this.data.initial = initial?.messageId
  }

  async flush() {
    while (this._buffer.length) {
      const data = await this.adapt(this._buffer.splice(0))
      this.ctx.emit('chat/message', data, this)
    }
  }

  async getMessages(count: number): Promise<Message[]> {
    const messages = await this.ctx.database
      .select('chat.message')
      .where(pick(this.data, ['platform', 'channelId']))
      .orderBy('id', 'desc')
      .limit(count)
      .execute()
    messages.reverse()
    if (messages.length < count) {
      messages.unshift(...await this.getHistory(count - messages.length, messages[0]?.messageId))
    }
    return messages
  }

  toJSON(): SyncChannel.Data {
    return this.data
  }
}

export namespace SyncChannel {
  export interface Data {
    platform: string
    guildId: string
    channelId: string
    assignee?: string
    guildName?: string
    channelName?: string
    avatar?: string
    initial?: string
  }
}
