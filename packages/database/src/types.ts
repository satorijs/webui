import { Universal } from '@satorijs/core'
import { Span } from './span'

declare module 'minato' {
  interface Tables {
    'satori.login': Login
    'satori.message': Message
    'satori.user': User
    'satori.member': GuildMember
    'satori.guild': Guild
    'satori.guild.sync': GuildSync
    'satori.channel': Channel
    'satori.channel.sync': ChannelSync
  }
}

declare module '@satorijs/protocol' {
  interface Message {
    sid?: bigint
  }
}

export interface Login extends Universal.Login {
  sync: LoginSync
  guildSyncs: GuildSync[]
  channelSyncs: ChannelSync[]
}

export interface LoginSync {
  onlineAt: number
  guildListAt: number
}

export interface User extends Universal.User {
  platform: string
  channel_id?: string
  syncAt?: number
}

export interface GuildMember extends Universal.GuildMember {
  guild: Guild
  user: User
  syncAt?: number
}

export interface Guild extends Universal.Guild {
  platform: string
  syncs: GuildSync[]
}

export interface GuildSync {
  guild: Guild
  login: Login
  channelListAt: number
  memberListAt: number
}

export interface Channel extends Universal.Channel {
  platform: string
  guild: Guild
  syncs: ChannelSync[]
}

export interface ChannelSync {
  channel: Channel
  login: Login
}

export interface Message extends Universal.Message {
  id: string
  uid: number
  sid: bigint
  platform: string
  flag: number
  deleted: boolean
  edited: boolean
  syncAt?: number
  user: User
  member: GuildMember
  channel: Channel
  guild: Guild
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
