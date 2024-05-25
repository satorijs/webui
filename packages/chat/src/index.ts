import { Context, Schema } from '@satorijs/core'
import {} from '@cordisjs/plugin-webui'
import {} from '@cordisjs/plugin-server-proxy'
import {} from '@satorijs/plugin-database'

export interface Data {
  proxy?: string
}

export const name = 'chat'

export const inject = ['webui']

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  ctx.webui.addEntry({
    dev: import.meta.resolve('../client/index.ts'),
    prod: [
      import.meta.resolve('../dist/index.js'),
      import.meta.resolve('../dist/style.css'),
    ],
  }, () => ({
    proxy: ctx.get('server.proxy')?.path,
  }))
}
