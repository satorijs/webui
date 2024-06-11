import { Context, Schema } from '@satorijs/core'
import {} from '@cordisjs/plugin-webui'
import {} from '@satorijs/plugin-database'
import {} from '@satorijs/plugin-server'

export interface Data {
  serverUrl: string
}

export const name = 'chat'

export const inject = ['webui', 'satori.server']

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  ctx.webui.addEntry({
    base: import.meta.url,
    dev: '../client/index.ts',
    prod: [
      '../dist/index.js',
      '../dist/style.css',
    ],
  }, () => ({
    serverUrl: ctx.satori.server.url,
  }))
}
