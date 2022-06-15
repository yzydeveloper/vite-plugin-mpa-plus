import type { Plugin, ResolvedConfig, UserConfig, Connect } from 'vite'
import type { Data } from 'ejs'
import type { IncomingMessage } from 'http'
import type { PluginMultiPageOptions, InjectOptions, Pages, Rewrite } from './types'
import { relative, resolve, basename, posix } from 'path'
import { render } from 'ejs'
import { loadEnv, normalizePath as _normalizePath } from 'vite'
import history from 'connect-history-api-fallback'
import { processTags } from './htmlFixPlugin'

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

function evaluate(req: IncomingMessage, from: RegExp | undefined, to: any) {
    const url = req?.url || ''
    const match = url.match(from || /(?:)/)
    if (typeof to === 'string') {
        return to
    }
    if (typeof to === 'function') {
        return to({
            url,
            match,
            req
        })
    }
    throw new Error('Rewrite rule can only be of type string or function.')
}

// 二次处理规范化后的路径
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
    return {
        ...input,
        ...(viteConfig.build?.rollupOptions?.input as Record<string, string> ?? {})
    }
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

export function createPluginMultiPage(options: PluginMultiPageOptions): Plugin {
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
            const { historyApiFallback, pages = {} } = options
            const { base } = viteConfig
            let rewrites: Rewrite[] = []
            if (historyApiFallback?.rewrites) {
                rewrites = Object.values(pages).map(page => ({
                    from: new RegExp(`^/${page.filename}`),
                    to: posix.join(base, page.template)
                }))
                rewrites = [
                    ...rewrites,
                    ...historyApiFallback.rewrites
                ]
                Reflect.deleteProperty(historyApiFallback, 'rewrites')
            } else {
                rewrites = genHistoryApiFallbackRewrites(base, pages)
            }
            server.middlewares.use(async (req, res, next) => {
                const { from, to } = rewrites.find(item => req.url?.match(item.from)) ?? {} // 根据rewrites找到此路径要重写为的路径，此路径一定是page.filename
                if (to) {
                    const _to = evaluate(req, from, to)
                    const page = Object.values(pages).find(page => _normalizePath(`/${page.filename}`) === _normalizePath(`/${_to}`)) // 根据filename找到对应的page
                    if (page) {
                        req.url = _normalizePath(`/${page.template}`)
                        return next()
                    }
                }

                const _history = history({
                    disableDotRule: true,
                    htmlAcceptHeaders: [
                        'text/html',
                        'application/xhtml+xml'
                    ],
                    rewrites,
                    ...historyApiFallback
                }) as Connect.NextHandleFunction
                _history(req, res, next)
            })
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
                    tags: processTags(page.inject?.tags ?? []) ?? []
                }
            },
        }
    }
}
