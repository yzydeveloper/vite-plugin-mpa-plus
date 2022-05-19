import type { Plugin, ResolvedConfig, UserConfig } from 'vite'
import type { PluginMultiPageOptions } from './types'
import { resolve } from 'path'
import { loadEnv } from 'vite'

const VITE_PLUGIN_NAME = 'vite-plugin-multi-page'

export function createInput(options: PluginMultiPageOptions, viteConfig: UserConfig | ResolvedConfig) {
    let isMpa = false
    const { pages = {} } = options
    const { root } = viteConfig

    let input = Object.keys(pages).reduce<Record<string, string>>((result, page) => {
        isMpa = true
        const { template } = pages[page]
        result[page] = resolve(root || process.cwd(), template)
        return result
    }, {})
    if (!isMpa) {
        input = {}
    }
    return input
}

function PluginMultiPage(options: PluginMultiPageOptions): Plugin {
    let viteConfig: ResolvedConfig
    let env: Record<string, string> = {}

    return {
        name: VITE_PLUGIN_NAME,
        enforce: 'pre',
        config(config) {
            const input = createInput(options, config)
            return {
                build: {
                    rollupOptions: {
                        input,
                    },
                },
            }
        },
        configResolved(config) {
            env = loadEnv(config.mode, config.root)
            viteConfig = config
        },
        configureServer(server) {
        },
    }
}

export default PluginMultiPage
