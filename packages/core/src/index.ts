import type { PluginOption } from 'vite'
import type { Options } from './types'
import { createMpaPlugin } from './multiPagePlugin'
import { createHtmlFixPlugin } from './htmlFixPlugin'

export * from './types'

function createPlugin(options: Options): PluginOption {
    return [createMpaPlugin(options), createHtmlFixPlugin(options)]
}

export default createPlugin
