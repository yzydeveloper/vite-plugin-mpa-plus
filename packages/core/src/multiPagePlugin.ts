import type { Plugin, ResolvedConfig, UserConfig, Connect } from 'vite'
import type { Data } from 'ejs'
import type { IncomingMessage } from 'http'
import type { PluginMultiPageOptions, InjectOptions, Pages, Rewrite } from './types'
import { relative, resolve, basename, posix } from 'path'
import { render } from 'ejs'
import { loadEnv, normalizePath as _normalizePath } from 'vite'
import history from 'connect-history-api-fallback'
import { processTags } from './htmlFixPlugin'

const VITE_PLUGIN_NAME = 'vite-plugin-mpa-plus'
const DEFAULT_TEMPLATE = 'index.html'
const INJECT_ENTRY = /<\/body>/
const IS_INDEX = /^\/index$|^\/$/
const SKIPPED_EXTENSIONS = [
    '.mjs',
    '.js',
    '.ts',
    '.jsx',
    '.tsx',
    '.json',
    '.vue'
]
const SKIPPED_EXTENSIONS_REGEX = new RegExp(`\\.(${SKIPPED_EXTENSIONS.join('|').replace(/\./g, '')})$`)

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
        { from: /^\/$/, to: posix.join(base, 'index.html') }
    ]
}

// this is a try
function evaluateRewriteTo(req: Partial<IncomingMessage>, from: RegExp | undefined, to: any) {
    const url = req.url || ''
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

// Process the normalized path again
export function normalizePath(id: string) {
    const fsPath = slash(relative(process.cwd(), _normalizePath(`${id}`)))
    if (fsPath.startsWith('/') || fsPath.startsWith('../')) {
        return fsPath
    }
    return `/${fsPath}`
}

// create input
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

// create page
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

// Find the page according to ' rewrites.from '
// this is a try
export function tryFindPage(forgeReq: Partial<IncomingMessage>, rewrites: Rewrite[], pages: Pages = {}) {
    const { url } = forgeReq
    if (SKIPPED_EXTENSIONS_REGEX.test(url || '')) return
    const isIndex = url?.match(IS_INDEX)
    const rewrite = rewrites.find(item => {
        if (isIndex) {
            return '/index'.match(item.from) || '/'.match(item.from) // Compatible with /^\/index$/ /^\/$/
        }
        return url?.match(item.from)
    })
    if (!rewrite) return
    const to = evaluateRewriteTo(forgeReq, rewrite.from, rewrite.to)
    const page = Object.values(pages).find(page => _normalizePath(`/${page.filename}`) === _normalizePath(`/${to}`))
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
    let rewrites: Rewrite[] = []

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
                const page = tryFindPage(req, rewrites, pages)
                if (page) {
                    // const fsPath = resolve(viteConfig.root || process.cwd(), page.template)
                    // let content = readFileSync(fsPath, { encoding: 'utf-8' })
                    // content = await server.transformIndexHtml(_normalizePath(`/${page?.template}`), content, req.originalUrl)
                    // res.end(content)
                    req.url = _normalizePath(`/${page.template}`)
                }
                next()
            })

            server.middlewares.use(history({
                disableDotRule: undefined,
                htmlAcceptHeaders: [
                    'text/html',
                    'application/xhtml+xml'
                ],
                rewrites,
                ...historyApiFallback
            }) as Connect.NextHandleFunction)
        },
        transformIndexHtml: {
            enforce: 'pre',
            async transform(html, ctx) {
                const url = ctx.filename
                const { base } = viteConfig
                const excludeBaseUrl = url.replace(base, '/')
                const template = relative(process.cwd(), excludeBaseUrl)
                const page = tryFindPage({ url: ctx.originalUrl }, rewrites, options.pages) ?? createPage(options, template)
                const _html = await renderHtml(html, {
                    entry: page?.entry,
                    inject: page?.inject ?? {},
                    viteConfig,
                    env
                })
                return {
                    html: _html,
                    tags: processTags(page?.inject?.tags ?? []) ?? []
                }
            },
        }
    }
}
