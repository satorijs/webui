import { Context, Dict, mapValues, Schema, Universal } from '@satorijs/core'
import {} from '@cordisjs/plugin-webui'
import {} from '@satorijs/plugin-database'

export interface Data {
  guilds: Dict<Universal.Guild>
}

export const name = 'chat'

export const inject = ['webui', 'satori.database']

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  const entry = ctx.webui.addEntry({
    dev: import.meta.resolve('../client/index.ts'),
    prod: [
      import.meta.resolve('../dist/index.js'),
      import.meta.resolve('../dist/style.css'),
    ],
  }, () => ({
    guilds: mapValues(ctx.satori.database._guilds, g => g.data),
  }))

  const update = ctx.debounce(() => entry.refresh(), 0)

  ctx.on('satori/database/update', update)
}
