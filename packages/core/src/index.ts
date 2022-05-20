import type { Plugin, ResolvedConfig, UserConfig, Connect } from 'vite'
import type { Data } from 'ejs'
import type { PluginMultiPageOptions, InjectOptions, Pages } from './types'
import { relative, resolve, basename, posix } from 'path'
import { render } from 'ejs'
import { loadEnv, normalizePath as _normalizePath } from 'vite'
import history from 'connect-history-api-fallback'

const VITE_PLUGIN_NAME = 'vite-plugin-multiple-page'
const DEFAULT_TEMPLATE = 'index.html'
const INJECT_ENTRY = /<\/body>/

function slash(p: string): string {
    return p.replace(/\\/g, '/')
}

function genHistoryApiFallbackRewrites(base: string, pages: Pages = {}) {
    const multiPageRewrites = Object
        .keys(pages)
        .sort((a, b) => b.length - a.length)
        .map(name => ({
            from: new RegExp(`^/${name}`),
            to: posix.join(base, pages[name].template || `${name}.html`)
        }))
    return [
        ...multiPageRewrites,
        { from: /./, to: posix.join(base, 'index.html') }
    ]
}

export function normalizePath(id: string) {
    const fsPath = slash(relative(process.cwd(), _normalizePath(`${id}`)))
    if (fsPath.startsWith('/') || fsPath.startsWith('../')) {
        return fsPath
    }
    return `/${fsPath}`
}

export function createInput(options: PluginMultiPageOptions, viteConfig: UserConfig | ResolvedConfig) {
    let isMpa = false
    const { pages = {}, template = DEFAULT_TEMPLATE } = options
    const { root } = viteConfig

    const input = Object.keys(pages).reduce<Record<string, string>>((result, page) => {
        isMpa = true
        const { template } = pages[page]
        result[page] = resolve(root || process.cwd(), template)
        return result
    }, {})
    if (!isMpa) {
        const file = basename(template)
        const key = file.replace(/\.html/, '')
        return {
            [key]: resolve(root || process.cwd(), template),
        }
    }
    return input
}

export function createPage(
    options: PluginMultiPageOptions,
    fsPath: string
) {
    let page
    const {
        pages = {},
        entry, template, inject
    } = options
    const mpaNames = Object.keys(pages)
    if (mpaNames.length) {
        const name = mpaNames.filter(name => resolve(`/${pages[name].template}`) === resolve(`/${fsPath}`))?.[0]
        page = pages[name]
    } else {
        page = {
            entry,
            filename: 'index.html',
            template,
            inject
        }
    }
    return page
}

export async function renderHtml(
    html: string,
    pageOptions: {
        inject: InjectOptions
        viteConfig: ResolvedConfig
        env: Record<string, string>
        entry?: string
    },
) {
    const { inject, viteConfig, env, entry } = pageOptions
    const { data, ejsOptions } = inject
    const ejsData: Data = {
        ...(viteConfig?.env ?? {}),
        ...(viteConfig?.define ?? {}),
        ...(env || {}),
        ...data,
    }

    let result = await render(html, ejsData, ejsOptions)

    if (entry) {
        result = result.replace(
            INJECT_ENTRY,
            `<script type="module" src="${normalizePath(`${entry}`)}"></script>\n</body>`,
        )
    }
    return result
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
            const { historyApiFallback, pages } = options
            const { base } = viteConfig
            server.middlewares.use(
                history({
                    disableDotRule: true,
                    htmlAcceptHeaders: [
                        'text/html',
                        'application/xhtml+xml'
                    ],
                    rewrites: genHistoryApiFallbackRewrites(base, pages),
                    ...historyApiFallback
                }) as Connect.NextHandleFunction
            )
        },
        transformIndexHtml: {
            enforce: 'pre',
            async transform(html, ctx) {
                const url = ctx.filename
                const { base } = viteConfig
                const excludeBaseUrl = url.replace(base, '/')
                const template = relative(process.cwd(), excludeBaseUrl)
                const page = createPage(options, template)
                const _html = await renderHtml(html, {
                    entry: page.entry,
                    inject: page.inject || {},
                    viteConfig,
                    env
                })
                return {
                    html: _html,
                    tags: page.inject?.tags ?? []
                }
            },
        }
    }
}

export default PluginMultiPage
