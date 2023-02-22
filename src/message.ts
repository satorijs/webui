import { Bot, h, Session } from 'koishi'
import snowflake from './snowflake'

export interface Message {
  id: string
  content: string
  messageId: string
  platform: string
  guildId: string
  userId: string
  timestamp: Date
  quoteId?: string
  username: string
  nickname: string
  channelId: string
  selfId: string
  lastUpdated?: Date
  deleted?: number
}

export namespace Message {
  export function adapt(message: Partial<Session>, bot: Bot = message.bot, guildId: string = message.guildId): Message {
    const elements = h.parse(message.content)
    let quoteId: string = null
    if (elements[0]?.type === 'quote') {
      quoteId = elements.shift().attrs.id
      message.content = elements.join('')
    }
    return {
      id: snowflake().toString(),
      messageId: message.messageId,
      content: message.content,
      platform: bot.platform,
      guildId: message.guildId || guildId, // eg. discord
      timestamp: new Date(message.timestamp),
      userId: message.userId || message.author.userId,
      username: message.author.username,
      nickname: message.author.nickname,
      channelId: message.channelId,
      selfId: bot.selfId,
      quoteId,
    }
  }
}
