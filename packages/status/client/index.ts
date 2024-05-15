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

  ctx.slot({
    type: 'plugin-details',
    component: Config,
    order: -500,
  })

  ctx.settings({
    id: 'satori',
    schema: Schema.object({
      mergeThreshold: Schema.number().default(10).description('当登录号的数量超过这个值时将合并显示状态指示灯。'),
    }).description('Satori 设置'),
  })
}
