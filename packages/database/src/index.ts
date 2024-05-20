import {} from 'minato'
import { Bot, Context, Dict, Schema, Service, Universal } from '@satorijs/core'
import { SyncChannel } from './channel'
import { SyncGuild } from './guild'

export * from './types'

declare module 'cordis' {
  interface Context {
    'satori.database': SatoriDatabase
  }
}

declare module '@satorijs/core' {
  interface Satori {
    database: SatoriDatabase
  }
}

class SatoriDatabase extends Service<SatoriDatabase.Config, Context> {
  static inject = ['model', 'database']

  _guilds: Dict<SyncGuild> = {}
  _channels: Dict<SyncChannel> = {}

  stopped = false

  private _botTasks = new WeakMap<Bot, Promise<void>>()

  constructor(ctx: Context, public config: SatoriDatabase.Config) {
    super(ctx, 'satori.database', true)

    const self = this

    // ctx.accessor('bot.getGuildList', {
    //   get: () => async function (this: Bot) {
    //     const data = await ctx.database.get('satori.guild', {
    //       logins: {
    //         $some: {
    //           platform: this.platform,
    //           'user.id': this.user.id,
    //         },
    //       },
    //     })
    //     if (data.length) return data
    //     return data
    //   },
    // })

    ctx.accessor('bot.getMessageList', {
      get: () => async function (this: Bot, channelId: string, id: string, dir?: Universal.Direction, limit?: number, order?: Universal.Order) {
        const key = this.platform + '/' + channelId
        self._channels[key] ||= new SyncChannel(ctx, this, channelId)
        return await self._channels[key].getMessageList(id, dir, limit, order)
      },
    })

    ctx.model.extend('satori.message', {
      'uid': 'unsigned(8)',
      'sid': 'bigint', // int64
      'id': 'char(255)',
      'platform': 'char(255)',
      'user.id': 'char(255)',
      'channel.id': 'char(255)',
      'guild.id': 'char(255)',
      'quote.id': 'char(255)',
      'content': 'text',
      'createdAt': 'unsigned(8)',
      'updatedAt': 'unsigned(8)',
      'flag': 'unsigned(1)',
      'deleted': 'boolean',
      'edited': 'boolean',
    }, {
      primary: 'uid',
      autoInc: true,
      unique: [
        ['id', 'channel.id', 'platform'],
        ['sid', 'channel.id', 'platform'],
      ],
    })

    ctx.model.extend('satori.user', {
      'id': 'char(255)',
      'platform': 'char(255)',
      'name': 'char(255)',
      'nick': 'char(255)',
      'avatar': 'char(255)',
    }, {
      primary: ['id', 'platform'],
    })

    ctx.model.extend('satori.guild', {
      'id': 'char(255)',
      'platform': 'char(255)',
      'name': 'char(255)',
      'avatar': 'char(255)',
    }, {
      primary: ['id', 'platform'],
    })

    ctx.model.extend('satori.channel', {
      'id': 'char(255)',
      'platform': 'char(255)',
      'name': 'char(255)',
    }, {
      primary: ['id', 'platform'],
    })

    ctx.model.extend('satori.login', {
      'platform': 'char(255)',
      'user.id': 'char(255)',
      'guilds': {
        type: 'manyToMany',
        table: 'satori.guild',
        target: 'logins',
      },
    }, {
      primary: ['platform', 'user.id'],
    })
  }

  async start() {
    this.ctx.on('message', (session) => {
      const { platform, channelId } = session
      if (session.bot.hidden) return
      const key = platform + '/' + channelId
      this._channels[key] ||= new SyncChannel(this.ctx, session.bot, session.channelId)
      if (this._channels[key].bot === session.bot) {
        this._channels[key].queue(session)
      }
    })

    this.ctx.on('message-deleted', async (session) => {
      // TODO update local message
      await this.ctx.database.set('satori.message', {
        id: session.messageId,
        platform: session.platform,
      }, {
        deleted: true,
        updatedAt: +new Date(),
      })
    })

    this.ctx.on('message-updated', async (session) => {
      // TODO update local message
      await this.ctx.database.set('satori.message', {
        id: session.messageId,
        platform: session.platform,
      }, {
        content: session.content,
        updatedAt: +new Date(),
      })
    })

    this.ctx.on('bot-status-updated', async (bot) => {
      this.updateBot(bot)
    })

    this.ctx.bots.forEach(async (bot) => {
      this.updateBot(bot)
    })
  }

  async stop() {
    this.stopped = true
  }

  private async updateBot(bot: Bot) {
    if (bot.hidden) return
    if (!await bot.supports('message.list') || !await bot.supports('guild.list')) return
    if (bot.status !== Universal.Status.ONLINE) {
      this._botTasks.delete(bot)
      for (const channel of Object.values(this._channels)) {
        if (channel.bot !== bot) continue
        channel.hasLatest = false
      }
      return
    }
    this._botTasks.has(bot) || this._botTasks.set(bot, (async () => {
      for await (const guild of bot.getGuildIter()) {
        const key = bot.platform + '/' + guild.id
        this._guilds[key] ||= new SyncGuild(bot, guild)
      }
    })())
    // const tasks: Promise<any>[] = []
    // for await (const guild of bot.getGuildIter()) {
    //   const key = bot.platform + '/' + guild.id
    //   this._guilds[key] ||= new SyncGuild(bot, guild)
    //   tasks.push((async () => {
    //     for await (const channel of bot.getChannelIter(guild.id)) {
    //       const key = bot.platform + '/' + guild.id + '/' + channel.id
    //       this._channels[key] ||= new SyncChannel(this.ctx, bot, guild.id, channel)
    //     }
    //   })())
    // }
    // await Promise.all(tasks)
  }
}

namespace SatoriDatabase {
  export interface Config {
    message: {
      defaultLimit: number
    }
  }

  export const Config: Schema<Config> = Schema.object({
    message: Schema.object({
      defaultLimit: Schema.natural().default(50),
    }),
  })
}

export default SatoriDatabase
