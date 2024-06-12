import {} from 'minato'
import { Context, Dict, Schema, Service } from '@satorijs/core'
import { SyncChannel } from './channel'
import { SyncGuild } from './guild'
import CachedBot from './bot'

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
    updateSync(): Promise<void>
  }
}

class SatoriDatabase extends Service<SatoriDatabase.Config> {
  static inject = ['model', 'database']

  _guilds: Dict<SyncGuild> = {}
  _channels: Dict<SyncChannel> = {}

  stopped = false

  constructor(public ctx: Context, public config: SatoriDatabase.Config) {
    super(ctx, 'satori.database', true)

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
      'type': 'integer',
      'parentId': 'char(255)',
      'position': 'integer',
      'guild': {
        type: 'manyToOne',
        table: 'satori.guild',
        target: 'channels',
      },
    }, {
      primary: ['id', 'platform'],
    })

    ctx.model.extend('satori.login', {
      'platform': 'char(255)',
      'user.id': 'char(255)',
      'sync.onlineAt': 'unsigned(8)',
      'sync.guildListAt': 'unsigned(8)',
    }, {
      primary: ['platform', 'user.id'],
    })

    ctx.model.extend('satori.member', {
      'guild': {
        type: 'manyToOne',
        table: 'satori.guild',
        target: 'members',
      },
      'user': {
        type: 'manyToOne',
        table: 'satori.user',
      },
      'name': 'char(255)',
    }, {
      primary: ['guild', 'user'],
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
        target: 'guildSyncs',
      },
      'channelListAt': 'unsigned(8)',
      'memberListAt': 'unsigned(8)',
    }, {
      primary: ['guild', 'login'],
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
        target: 'channelSyncs',
      },
    }, {
      primary: ['channel', 'login'],
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
      // 'guild': {
      //   type: 'manyToOne',
      //   table: 'satori.guild',
      // },
      // 'channel': {
      //   type: 'manyToOne',
      //   table: 'satori.channel',
      // },
      // 'member': {
      //   type: 'manyToOne',
      //   table: 'satori.member',
      // },
      // 'user': {
      //   type: 'manyToOne',
      //   table: 'satori.user',
      // },
    }, {
      primary: 'uid',
      autoInc: true,
      unique: [
        ['id', 'channel.id', 'platform'],
        ['sid', 'channel.id', 'platform'],
      ],
    })

    ctx.mixin(new CachedBot(this), {
      getGuildList: 'bot.getGuildList',
      getChannelList: 'bot.getChannelList',
      getMessageList: 'bot.getMessageList',
      updateSync: 'bot.updateSync',
    })

    ctx.on('message', (session) => {
      const { platform, channelId } = session
      if (session.bot.hidden) return
      const key = platform + '/' + channelId
      this._channels[key] ||= new SyncChannel(ctx, session.bot, session.channelId)
      if (this._channels[key].bot === session.bot) {
        this._channels[key].queue(session)
      }
    })

    ctx.on('message-deleted', async (session) => {
      // TODO update local message
      await ctx.database.set('satori.message', {
        id: session.messageId,
        platform: session.platform,
      }, {
        deleted: true,
        updatedAt: +new Date(),
      })
    })

    ctx.on('message-updated', async (session) => {
      // TODO update local message
      await ctx.database.set('satori.message', {
        id: session.messageId,
        platform: session.platform,
      }, {
        content: session.content,
        updatedAt: +new Date(),
      })
    })

    ctx.on('login-added', async ({ bot }) => {
      await bot.updateSync()
    })

    ctx.on('login-updated', async ({ bot }) => {
      await bot.updateSync()
    })

    ctx.bots.forEach(async (bot) => {
      await bot.updateSync()
    })
  }

  async stop() {
    this.stopped = true
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
