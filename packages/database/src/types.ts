import { Universal } from '@satorijs/core'
import { Span } from './span'

declare module 'minato' {
  interface Tables {
    'satori.login': Login
    'satori.message': Message
    'satori.user': User
    'satori.guild': Guild
    'satori.channel': Channel
  }
}

declare module '@satorijs/protocol' {
  interface Message {
    sid?: bigint
  }
}

export interface Login extends Universal.Login {
  guilds: Guild[]
}

export interface User extends Universal.User {
  platform: string
  channel_id?: string
}

export interface Guild extends Universal.Guild {
  platform: string
  logins: Login[]
}

export interface Channel extends Universal.Channel {
  platform: string
}

export interface Message extends Universal.Message {
  id: string
  uid: number
  sid: bigint
  platform: string
  flag: number
  deleted: boolean
  edited: boolean
}

export namespace Message {
  export enum Flag {
    FRONT = 1,
    BACK = 2,
    FINAL = 4,
  }

  function sequence(ts: bigint, dir?: Span.Direction, ref?: bigint) {
    if (!dir || !ref) return (ts << 12n) + 0x800n
    if (ts === ref >> 12n) {
      return ref + (dir === 'before' ? -1n : 1n)
    } else {
      return (ts << 12n) + (dir === 'before' ? 0xfffn : 0n)
    }
  }

  export const from = (message: Universal.Message, platform: string, payload: Omit<Universal.Message, 'id'> = message, dir?: Span.Direction, ref?: bigint) => ({
    platform,
    id: message.id,
    sid: sequence(BigInt(message.createdAt!), dir, ref),
    content: message.content,
    channel: { id: payload.channel?.id },
    user: { id: payload.user?.id },
    guild: { id: payload.guild?.id },
    quote: { id: message.quote?.id },
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    flag: 0,
  } as Message)
}
