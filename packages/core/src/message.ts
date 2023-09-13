import { h, Session, Universal } from 'koishi'

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
  export function fromSession(session: Session): Message {
    const elements = h.parse(session.content)
    let quoteId: string = null
    if (elements[0]?.type === 'quote') {
      quoteId = elements.shift().attrs.id
      session.content = elements.join('')
    }
    return {
      id: snowflake().toString(),
      messageId: session.messageId,
      content: session.content,
      platform: session.platform,
      timestamp: new Date(session.timestamp),
      userId: session.userId,
      channelId: session.channelId,
      avatar: session.data.user.avatar,
      username: session.data.user.name,
      nickname: session.data.member?.name,
      quoteId,
    }
  }

  export function fromUniversal(message: Universal.Message, platform: string): Message {
    const elements = h.parse(message.content)
    let quoteId: string = null
    if (elements[0]?.type === 'quote') {
      quoteId = elements.shift().attrs.id
      message.content = elements.join('')
    }
    return {
      platform,
      id: snowflake().toString(),
      messageId: message.id,
      content: message.content,
      timestamp: new Date(message.timestamp),
      channelId: message.channel.id,
      userId: message.user.id,
      avatar: message.user.avatar,
      username: message.user.name,
      nickname: message.member?.name,
      quoteId,
    }
  }
}
