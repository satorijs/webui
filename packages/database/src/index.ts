import {} from 'minato'
import { Bot, Context, Dict, Schema, Service, Universal } from '@satorijs/core'
import { SyncChannel } from './channel'
import { SyncGuild } from './guild'
import { Login } from './types'

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

  interface Bot {
    sync: Login['sync']
  }
}

class SatoriDatabase extends Service<SatoriDatabase.Config, Context> {
  static inject = ['model', 'database']

  _guilds: Dict<SyncGuild> = {}
  _channels: Dict<SyncChannel> = {}

  stopped = false

  constructor(ctx: Context, public config: SatoriDatabase.Config) {
    super(ctx, 'satori.database', true)

    const self = this

    ctx.accessor('bot.getGuildList', {
      get: () => async function (this: Bot) {
        if (this.sync.guildListAt >= this.sync.onlineAt) {
          const data = await ctx.database.get('satori.guild', {
            syncs: {
              $some: {
                login: {
                  platform: this.platform,
                  'user.id': this.user.id,
                },
              },
            },
          })
          return { data }
        }
        const data: Universal.Guild[] = []
        for await (const guild of this.self.getGuildIter()) {
          data.push(guild)
        }
        await ctx.database.set('satori.login', {
          platform: this.platform,
          'user.id': this.user.id,
        }, {
          sync: {
            guildListAt: this.timestamp,
          },
          guildSyncs: {
            // ?
          },
        })
        return { data }
      },
    })

    ctx.accessor('bot.getChannelList', {
      get: () => async function (this: Bot, guildId: string) {
        // FIXME sync maybe undefined
        const [sync] = await ctx.database.get('satori.guild.sync', {
          login: {
            platform: this.platform,
            'user.id': this.user.id,
          },
          guild: {
            id: guildId,
          },
        })
        if (sync!.channelListAt >= this.sync.onlineAt) {
          const data = await ctx.database.get('satori.channel', {
            guild: {
              id: guildId,
            },
            syncs: {
              $some: {
                login: {
                  platform: this.platform,
                  'user.id': this.user.id,
                },
              },
            },
          })
          return { data }
        }
        const data: Universal.Channel[] = []
        for await (const channel of this.self.getChannelIter(guildId)) {
          data.push(channel)
        }
        await ctx.database.set('satori.guild.sync', {
          login: {
            platform: this.platform,
            'user.id': this.user.id,
          },
        }, {
          channelListAt: this.timestamp,
          // ?
        })
        return { data }
      },
    })

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
      'syncAt': 'unsigned(8)',
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
      'syncAt': 'unsigned(8)',
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
      'syncAt': 'unsigned(8)',
    }, {
      primary: ['id', 'platform'],
    })

    ctx.model.extend('satori.login', {
      'platform': 'char(255)',
      'user.id': 'char(255)',
      'sync.guildListAt': 'unsigned(8)',
    }, {
      primary: ['platform', 'user.id'],
    })

    ctx.model.extend('satori.guild.sync', {
      'guild': {
        type: 'manyToOne',
        table: 'satori.guild',
        target: 'syncs',
      },
      'login': {
        type: 'manyToOne',
        table: 'satori.login',
        target: 'syncs',
      },
      'channelListAt': 'unsigned(8)',
      'memberListAt': 'unsigned(8)',
    })

    ctx.model.extend('satori.channel.sync', {
      'channel': {
        type: 'manyToOne',
        table: 'satori.channel',
        target: 'syncs',
      },
      'login': {
        type: 'manyToOne',
        table: 'satori.login',
        target: 'syncs',
      },
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
      for (const channel of Object.values(this._channels)) {
        if (channel.bot !== bot) continue
        channel.hasLatest = false
      }
      const query = {
        platform: bot.platform,
        'user.id': bot.user.id,
      }
      const [login] = await this.ctx.database.get('satori.login', query)
      bot.sync = login?.sync || { onlineAt: Date.now() }
      await this.ctx.database.upsert('satori.login', [{
        ...query,
        sync: bot.sync,
      }])
      return
    }
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
