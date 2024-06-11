import { Bot, Context, Dict, Schema, Time, Universal } from '@satorijs/core'
import {} from '@cordisjs/loader'
import {} from '@cordisjs/plugin-webui'
import {} from '@satorijs/plugin-server'

declare module '@satorijs/core' {
  interface Bot {
    _messageSent: TickCounter
    _messageReceived: TickCounter
  }
}

export interface Data {
  bots: Dict<Data.Bot>
  serverUrl?: string
}

export namespace Data {
  export interface Bot extends Universal.Login {
    error?: string
    paths?: string[]
    messageSent: number
    messageReceived: number
  }
}

class TickCounter {
  public stop: () => void

  private data = new Array(60).fill(0)

  private tick = () => {
    this.data.unshift(0)
    this.data.splice(-1, 1)
  }

  constructor(ctx: Context) {
    this.stop = ctx.setInterval(() => this.tick(), Time.second)
  }

  public add(value = 1) {
    this.data[0] += value
  }

  public get() {
    return this.data.reduce((prev, curr) => prev + curr, 0)
  }

  static initialize(bot: Bot, ctx: Context) {
    bot._messageSent = new TickCounter(ctx)
    bot._messageReceived = new TickCounter(ctx)
  }
}

export const name = 'status'

export const inject = {
  required: ['webui'],
  optional: ['satori.server'],
}

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  const entry = ctx.webui.addEntry({
    base: import.meta.url,
    dev: '../client/index.ts',
    prod: [
      '../dist/index.js',
      '../dist/style.css',
    ],
  }, () => {
    const bots: Dict<Data.Bot> = {}
    for (const bot of ctx.bots) {
      if (bot.hidden) continue
      bots[bot.sid] = {
        ...bot.toJSON(),
        paths: ctx.get('loader')?.locate(),
        error: bot.error?.message,
        messageSent: bot._messageSent.get(),
        messageReceived: bot._messageReceived.get(),
      }
    }
    return { bots, serverUrl: ctx.get('satori.server')?.url }
  })

  const update = ctx.debounce(() => entry.refresh(), 0)

  ctx.on('before-send', (session) => {
    session.bot._messageSent?.add(1)
  })

  ctx.on('message', (session) => {
    session.bot._messageReceived?.add(1)
  })

  ctx.bots.forEach(bot => TickCounter.initialize(bot, ctx))

  ctx.on('login-added', ({ bot }) => {
    TickCounter.initialize(bot, ctx)
    update()
  })

  ctx.on('login-removed', ({ bot }) => {
    bot._messageSent.stop()
    bot._messageReceived.stop()
    update()
  })

  ctx.on('login-updated', () => {
    update()
  })
}
