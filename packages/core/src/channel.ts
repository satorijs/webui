import { Context, Logger, pick, Session, Universal } from 'koishi'
import { Message } from './message'

const logger = new Logger('message')

export enum SyncStatus {
  SYNCING,
  SYNCED,
  FAILED,
}

export class SyncChannel {
  public status = SyncStatus.SYNCING
  private _buffer: Universal.Message[]
  private _initTask: Promise<void>
  private _queueTask = Promise.resolve()

  constructor(private ctx: Context, public platform: string, public channelId: string) {}

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

  async init(session: Session) {
    const [from] = await this.ctx.database
      .select('message')
      .where(pick(session, ['platform', 'channelId']))
      .orderBy('id', 'desc')
      .limit(1)
      .execute()
    if (!from) return
    // let toMessage: Universal.Message = null
    // if (!to) {
    //   logger.debug('!to')
    //   const latestMessages = await bot.getMessageList(channelId)
    //   to = latestMessages[latestMessages.length - 1].messageId
    //   toMessage = latestMessages[latestMessages.length - 1]
    // } else {
    //   toMessage = await bot.getMessage(channelId, to)
    // }
    logger.debug('from %o to %o', from.messageId, session.messageId)

    let front = session.messageId
    // eslint-disable-next-line no-labels
    label: while (true) {
      const messages = await session.bot.getMessageList(session.channelId, front)
      front = messages[0].messageId
      for (const message of messages.reverse()) {
        if (message.messageId === from.messageId) {
          // eslint-disable-next-line no-labels
          break label
        } else {
          this._buffer.unshift(message)
        }
      }
    }

    this.status = SyncStatus.SYNCED
  }

  async flush() {
    while (this._buffer.length) {
      await this.ctx.database.upsert('message', this._buffer.splice(0).map((session) => {
        return Message.adapt(session)
      }))
    }
  }

  async getMessages(): Promise<Message[]> {
    return this.ctx.database
      .select('message')
      .where(pick(this, ['platform', 'channelId']))
      .orderBy('id', 'desc')
      .limit(100)
      .execute()
  }
}
