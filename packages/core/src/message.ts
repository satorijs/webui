import { h, Session } from 'koishi'

// https://discord.com/developers/docs/reference#snowflakes
// timestamp      63 to 22      42 bits       (snowflake >> 22) + 1420070400000
// worker ID      21 to 17      5 bits        (snowflake & 0x3E0000) >> 17
// process ID     16 to 12      5 bits        (snowflake & 0x1F000) >> 12
// increment      11 to 0       12 bits       snowflake & 0xFFF

const epoch = 1574773581000n // Tue Nov 26 2019 21:06:21 GMT+0800
const TIMESTAMP_SHIFT = 22n

let increment = 0n

export default function snowflake() {
  const timestamp = Date.now()
  const result = ((BigInt(timestamp) - epoch) << TIMESTAMP_SHIFT) + (increment++)
  increment %= 0xfffn
  return result
}

export function toTimestamp(snowflake: bigint) {
  return (snowflake >> TIMESTAMP_SHIFT) + epoch
}

export interface Message {
  id: string
  content: string
  messageId: string
  platform: string
  guildId: string
  userId: string
  avatar?: string
  timestamp: Date
  quoteId?: string
  username: string
  nickname: string
  channelId: string
  lastUpdated?: Date
  deleted?: number
}

export namespace Message {
  export function adapt(message: Partial<Session>, platform = message.platform, guildId = message.guildId): Message {
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
      platform,
      guildId,
      timestamp: new Date(message.timestamp),
      userId: message.userId || message.author.userId,
      avatar: message.author.avatar,
      username: message.author.username,
      nickname: message.author.nickname,
      channelId: message.channelId,
      quoteId,
    }
  }
}
