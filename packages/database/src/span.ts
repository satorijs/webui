import { clone, remove, Universal } from '@satorijs/core'
import { $, Update } from 'minato'
import { Message } from './types'
import { SyncChannel } from './channel'

export type MessageLike = Message | { sid: bigint }

export class Span {
  prev?: Span
  prevTask?: Promise<Span | undefined>
  prevTemp?: Universal.TwoWayList<Universal.Message>
  next?: Span
  nextTask?: Promise<Span | undefined>
  nextTemp?: Universal.TwoWayList<Universal.Message>
  syncTask?: Promise<void>

  constructor(
    public channel: SyncChannel,
    public type: Span.Type,
    public front: Span.Endpoint,
    public back: Span.Endpoint,
    public data?: Message[],
  ) {}

  link(dir: Span.Direction, span?: Span) {
    const w = Span.words[dir]
    this[w.next] = span
    if (span) span[w.prev] = this
  }

  merge(dir: Span.Direction) {
    const w = Span.words[dir]
    const next = this[w.next]
    if (next?.type !== this.type) return false
    remove(this.channel._spans, next)
    this.data?.[w.push](...next.data!)
    this[w.front] = next[w.front]
    this[w.temp] = next[w.temp]
    this[w.task] = next[w.task]
    this.link(dir, next[w.next])
    return true
  }

  async flush() {
    if (this.type !== Span.Type.LOCAL) throw new Error('expect local span')
    console.log('flush', !!this.prev, !!this.prevTemp, !!this.next, !!this.nextTemp)
    if (!this.prev && this.prevTemp) return
    if (!this.next && this.nextTemp) return
    await Promise.all([this.prev?.syncTask, this.next?.syncTask])
    if (!this.channel._spans.includes(this)) return
    return this.syncTask ||= this.sync()
  }

  private async sync() {
    this.type = Span.Type.SYNC
    await this.channel.ctx.database.upsert('satori.message', (row) => {
      const data: Update<Message>[] = clone(this.data!)
      if (this.next?.type === Span.Type.REMOTE) {
        data.push({
          ...this.channel._query,
          sid: this.next.back[0],
          flag: $.and(row.flag, $.not(Message.Flag.BACK)),
        })
      } else {
        (data.at(-1)!.flag as number) |= Message.Flag.FRONT
      }
      if (this.prev?.type === Span.Type.REMOTE) {
        data.unshift({
          ...this.channel._query,
          sid: this.prev.front[0],
          flag: $.and(row.flag, $.not(Message.Flag.FRONT)),
        })
      } else {
        (data.at(0)!.flag as number) |= Message.Flag.BACK
      }
      console.log(data.at(0), data.at(-1))
      return data
    }, ['sid', 'channel.id', 'platform'])
    this.type = Span.Type.REMOTE
    delete this.data
    this.merge('after')
    this.merge('before')
  }

  async collect(message: MessageLike, dir: Span.Direction, limit: number, exclusive: number) {
    const w = Span.words[dir]
    if (this[w.front][0] === message.sid) {
      if (exclusive) return []
      if ('id' in message) return [message]
    }

    if (this.data) {
      const index = this.data.findIndex(item => item.sid === message.sid)
      console.log('index', this.data.length, index, exclusive, message.sid)
      return w.slice(this.data, index + w.unit * exclusive)
    }

    const data = await this.channel.ctx.database
      .select('satori.message')
      .where({
        ...this.channel._query,
        sid: {
          [exclusive ? w.$gt : w.$gte]: message.sid,
          [w.$lte]: this[w.front][0],
        },
      })
      .orderBy('sid', w.order)
      .limit(limit)
      .execute()
    if (dir === 'before') data.reverse()
    return data
  }

  async extend(dir: Span.Direction, limit: number, result?: Universal.TwoWayList<Universal.Message>) {
    const w = Span.words[dir]
    if (!result) {
      result = await this.channel.bot.self.getMessageList(this.channel.channelId, this[w.front][1], dir, limit)
      console.log('raw:', result.data.length)
    }
    const data: Message[] = []
    const { span, temp } = this.channel.collect(result, dir, data, dir === 'after' ? -1 : result.data.length)
    if (!span && dir === 'before' && !result[w.next]) this.channel.hasEarliest = true
    if (data.length || span) {
      return this.channel.insert(data, {
        [w.prev]: this,
        [w.next]: span,
        [w.temp]: temp,
      })
    }
  }
}

export namespace Span {
  export type Direction = 'before' | 'after'
  export type Endpoint = [bigint, string]

  export enum Type {
    LOCAL,
    SYNC,
    REMOTE,
  }

  export interface PrevNext<T> {
    prev?: T
    next?: T
  }

  export const words = {
    before: {
      prev: 'next',
      next: 'prev',
      push: 'unshift',
      front: 'back',
      back: 'front',
      task: 'prevTask',
      temp: 'prevTemp',
      order: 'desc',
      $lt: '$gt',
      $gt: '$lt',
      $lte: '$gte',
      $gte: '$lte',
      unit: -1,
      last: 0,
      slice: <T>(arr: T[], index: number) => arr.slice(0, index + 1),
    },
    after: {
      prev: 'prev',
      next: 'next',
      push: 'push',
      front: 'front',
      back: 'back',
      task: 'nextTask',
      temp: 'nextTemp',
      order: 'asc',
      $lt: '$lt',
      $gt: '$gt',
      $lte: '$lte',
      $gte: '$gte',
      unit: 1,
      last: -1,
      slice: <T>(arr: T[], index: number) => arr.slice(index),
    },
  } as const
}
