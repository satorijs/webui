import { Bot, pick, Universal } from '@satorijs/core'
import { Channel, Guild, LoginSync } from './types'
import { SyncChannel } from './channel'
import SatoriDatabase from '.'

interface CachedBot extends Bot {
  sync: LoginSync
}

class CachedBot {
  constructor(private sd: SatoriDatabase) {}

  private get _query() {
    return {
      platform: this.platform,
      'user.id': this.user.id,
    }
  }

  async getGuildList() {
    const self: this = this[Symbol.for('cordis.original')]
    if (!this.sync) return self.getGuildList()

    if (this.sync.guildListAt >= this.sync.onlineAt) {
      const data = await this.sd.ctx.database.get('satori.guild', {
        syncs: {
          $some: {
            login: this._query,
          },
        },
      })
      return { data }
    }
    const data: Partial<Guild>[] = []
    for await (const guild of self.getGuildIter()) {
      data.push(pick(guild, ['id', 'name', 'avatar']))
    }
    await this.sd.ctx.database.set('satori.login', this._query, {
      sync: {
        guildListAt: Date.now(),
      },
      guildSyncs: data.map((guild) => ({ guild: { $create: {
        platform: this.platform,
        ...guild,
      } } })) as any,
    })
    return { data }
  }

  async getChannelList(guildId: string) {
    const self: this = this[Symbol.for('cordis.original')]
    if (!this.sync) return self.getChannelList(guildId)

    // FIXME sync maybe undefined
    const [sync] = await this.sd.ctx.database.get('satori.guild.sync', {
      login: {
        platform: this.platform,
        'user.id': this.user.id,
      },
      guild: {
        id: guildId,
      },
    })
    if (sync?.channelListAt >= this.sync.onlineAt) {
      const data = await this.sd.ctx.database.get('satori.channel', {
        guild: { id: guildId },
        syncs: {
          $some: {
            login: this._query,
          },
        },
      })
      return { data }
    }
    const data: Partial<Channel>[] = []
    for await (const channel of self.getChannelIter(guildId)) {
      data.push(pick(channel, ['id', 'name', 'type', 'parentId', 'position']))
    }
    await this.sd.ctx.database.set('satori.login', this._query, {
      guildSyncs: {
        $create: {
          guild: { id: guildId, platform: this.platform },
          channelListAt: Date.now(),
        },
      },
      channelSyncs: data.map((channel) => ({ channel: { $create: {
        platform: this.platform,
        guild: { id: guildId },
        ...channel,
      } } })) as any,
    })
    return { data }
  }

  async getMessageList(channelId: string, id: string, dir?: Universal.Direction, limit?: number, order?: Universal.Order) {
    if (!this.sync) {
      const self: this = this[Symbol.for('cordis.original')]
      return self.getMessageList(channelId, id, dir, limit, order)
    }
    const key = this.platform + '/' + channelId
    this.sd._channels[key] ||= new SyncChannel(this.sd.ctx, this, channelId)
    return await this.sd._channels[key].getMessageList(id, dir, limit, order)
  }

  async updateSync() {
    if (this.hidden) return
    if (this.status !== Universal.Status.ONLINE) return
    for (const channel of Object.values(this.sd._channels)) {
      if (channel.bot.sid !== this.sid) continue
      channel.hasLatest = false
    }
    const update: Partial<LoginSync> = {
      onlineAt: Date.now(),
    }
    const [login] = await this.ctx.database.get('satori.login', this._query)
    this.sync = login?.sync || {}
    Object.assign(this.sync, update)
    await this.ctx.database.upsert('satori.login', [{
      ...this._query,
      sync: update,
    }])
  }
}

export default CachedBot
