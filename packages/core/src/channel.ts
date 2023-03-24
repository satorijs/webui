import { Context, Logger, pick, Session, Universal } from 'koishi'
import { Message } from './message'

const logger = new Logger('message')

export enum SyncStatus {
  SYNCING,
  SYNCED,
  FAILED,
}

export interface ChannelData {
  platform: string
  guildId: string
  channelId: string
  name?: string
  avatar?: string
  initial?: string
}

export class SyncChannel {
  public data: ChannelData
  public status = SyncStatus.SYNCING
  private _buffer: Universal.Message[] = []
  private _initTask: Promise<void>
  private _queueTask = Promise.resolve()

  constructor(private ctx: Context, platform: string, guildId: string, channelId: string) {
    this.data = { platform, guildId, channelId }
  }

  async queue(session: Session) {
    this._buffer.push(session)
    this.ensure(async () => {
      if (this.status === SyncStatus.SYNCING) {
        await (this._initTask ||= this.init(session))
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

  private async catchUp(final: Message, session: Session) {
    logger.debug('from %o to %o', final.messageId, session.messageId)
    let front = session.messageId
    // eslint-disable-next-line no-labels
    label: while (true) {
      const messages = await session.bot.getMessageList(session.channelId, front)
      front = messages[0].messageId
      for (const message of messages.reverse()) {
        if (message.messageId === final.messageId) {
          // eslint-disable-next-line no-labels
          break label
        } else {
          this._buffer.unshift(message)
        }
      }
    }
  }

  async init(session: Session) {
    const [[initial], [final]] = await Promise.all([
      this.ctx.database
        .select('chat.message')
        .where(pick(session, ['platform', 'channelId']))
        .orderBy('id', 'asc')
        .limit(1)
        .execute(),
      this.ctx.database
        .select('chat.message')
        .where(pick(session, ['platform', 'channelId']))
        .orderBy('id', 'desc')
        .limit(1)
        .execute(),
    ])
    if (final) {
      await this.catchUp(final, session)
    }
    this.status = SyncStatus.SYNCED
    this.data.initial = initial?.messageId
    this.ctx.emit('chat/channel', this.data, this)
  }

  async flush() {
    while (this._buffer.length) {
      const data = this._buffer.splice(0).map((session) => {
        return Message.adapt(session)
      })
      await this.ctx.database.upsert('chat.message', data)
      this.ctx.emit('chat/message', data, this)
    }
  }

  async getMessages(): Promise<Message[]> {
    return this.ctx.database
      .select('chat.message')
      .where(pick(this.data, ['platform', 'channelId']))
      .orderBy('id', 'desc')
      .limit(100)
      .execute()
  }
}
