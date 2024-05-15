import { Universal } from '@satorijs/core'
import { Span } from './span'

declare module 'minato' {
  interface Tables {
    'satori.message': Message
    'satori.user': Universal.User & { platform: string }
    'satori.guild': Universal.Guild & { platform: string }
    'satori.channel': Universal.Channel & { platform: string }
  }
}

declare module '@satorijs/protocol' {
  interface Message {
    sid?: bigint
  }
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

  export const from = (message: Universal.Message, platform: string, dir?: Span.Direction, ref?: bigint) => ({
    platform,
    id: message.id,
    sid: sequence(BigInt(message.createdAt!), dir, ref),
    content: message.content,
    channel: { id: message.channel?.id },
    user: { id: message.user?.id },
    guild: { id: message.guild?.id },
    quote: { id: message.quote?.id },
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    flag: 0,
  } as Message)
}
