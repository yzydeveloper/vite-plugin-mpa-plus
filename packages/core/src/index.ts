import type { PluginOption } from 'vite'
import type { PluginMultiPageOptions } from './types'
import { createPluginMultiPage } from './multiPagePlugin'
import { createPluginHtmlFix } from './htmlFixPlugin'

function createPlugin(options: PluginMultiPageOptions): PluginOption {
    return [createPluginMultiPage(options), createPluginHtmlFix()]
}

export default createPlugin
