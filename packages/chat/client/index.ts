import { Context, Dict, Service } from '@cordisjs/client'
import { computed, markRaw, reactive } from 'vue'
import HTTP from '@cordisjs/plugin-http'
import Satori, { Bot, Universal } from '@satorijs/core'
import SatoriAdapter from '@satorijs/adapter-satori'
import {} from '../src'
import Chat from './index.vue'
import './icons'

declare module '@cordisjs/client' {
  interface Context {
    chat: ChatService
  }
}

interface CachedLogin {
  bot: Bot
  login: Universal.Login
  guilds: Universal.Guild[]
}

export default class ChatService extends Service {
  static inject = {
    optional: ['chat'],
  }

  logins = reactive<Dict<CachedLogin>>({})

  guilds = computed(() => {
    const result: Dict<Universal.Guild & { platform: string; assignees: string[] }> = {}
    for (const data of Object.values(this.logins)) {
      for (const guild of data.guilds) {
        const key = `${data.login.platform}/${guild.id}`
        result[key] ??= { ...guild, platform: data.login.platform!, assignees: [] }
        result[key].assignees.push(data.bot.sid!)
      }
    }
    console.log(1, result, this.logins)
    return result
  })

  constructor(ctx: Context) {
    super(ctx, 'chat', true)
    ctx.plugin(HTTP)
    ctx.plugin(Satori)

    ctx.on('login-added', async (session) => {
      this.logins[session.sid] = {
        bot: markRaw(session.bot),
        login: session.bot.toJSON(),
        guilds: [],
      }
      for await (const item of session.bot.getGuildIter()) {
        this.logins[session.sid].guilds.push(item)
      }
    })

    ctx.on('login-updated', (session) => {
      // login-updated event may be triggered before login-added
      if (!this.logins[session.sid]) return
      this.logins[session.sid].login = session.bot.toJSON()
    })

    ctx.on('login-removed', (session) => {
      delete this.logins[session.sid]
    })

    ctx.inject(['satori'], (ctx) => {
      ctx.plugin(SatoriAdapter, {
        endpoint: new URL('/satori', location.href).href,
      })

      ctx.page({
        path: '/chat',
        name: '聊天',
        icon: 'activity:chat',
        order: 100,
        component: Chat,
      })

      ctx.menu('chat.message', [{
        id: '.delete',
        label: '删除消息',
      }, {
        id: '.quote',
        label: '引用回复',
      }])
    })
  }
}
