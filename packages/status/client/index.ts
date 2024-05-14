import { Context, Schema } from '@cordisjs/client'
import {} from '../src'
import Bots from './bots'
import Config from './config.vue'
import './icons'

declare module '@cordisjs/client' {
  interface Config {
    mergeThreshold: number
  }
}

export default (ctx: Context) => {
  ctx.plugin(Bots)

  // FIXME auto inject
  ctx.inject(['manager'], (ctx) => {
    ctx.slot({
      type: 'plugin-details',
      component: Config,
      order: -500,
    })
  })

  ctx.settings({
    id: 'status',
    schema: Schema.object({
      mergeThreshold: Schema.number().default(10).description('当机器人的数量超过这个值时将合并显示状态指示灯。'),
    }).description('机器人设置'),
  })
}
