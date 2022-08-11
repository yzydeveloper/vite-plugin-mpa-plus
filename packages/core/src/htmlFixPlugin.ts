import type { Plugin, ResolvedConfig } from 'vite'
import type { InjectOptions, Options } from './types'
import fs from 'fs'
import path from 'path'
import { normalizePath } from 'vite'
import { parse } from 'node-html-parser'

const VITE_PLUGIN_NAME = 'vite-plugin-html-fix'
const SPLIT_MARK = `_${VITE_PLUGIN_NAME}_`

function slash(p: string): string {
    return p.replace(/\\/g, '/')
}

function isProduction(mode: string) {
    return mode === 'production'
}

function writeFile(
    filename: string,
    content: string | Uint8Array
): void {
    const dir = path.dirname(filename)
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filename, content)
}

export function processTags(tags: InjectOptions['tags']): InjectOptions['tags'] {
    const _tags = tags?.map(tag => {
        const { attrs } = tag
        return {
            ...tag,
            attrs: {
                ...attrs,
                ...(attrs?.href ? { href: '' } : {}),
                ...(attrs?.src ? { src: '' } : {}),
                [VITE_PLUGIN_NAME]: `${attrs?.src || attrs?.href || ''}${SPLIT_MARK}${attrs?.src ? 'src' : 'href'}`
            }
        }
    })
    return _tags ?? []
}

export function createHtmlFixPlugin(options: Options): Plugin {
    let viteConfig: ResolvedConfig
    const emittedFiles: any[] = []
    return {
        name: VITE_PLUGIN_NAME,
        configResolved(config) {
            viteConfig = config
        },
        transformIndexHtml: {
            enforce: 'post',
            transform(html, ctx) {
                const root = parse(html)
                const nodes = root.querySelectorAll(`[${VITE_PLUGIN_NAME}]`)
                nodes.forEach(node => {
                    const [url, type] = node.getAttribute(VITE_PLUGIN_NAME)?.split(SPLIT_MARK) || []
                    node.setAttribute(type, url)
                })
                const _html = root.toString()

                const originalFileName = normalizePath(ctx.path)
                Object.values(options.pages ?? {}).forEach(page => {
                    if(originalFileName.includes(page.template ?? '')) {
                        const normalPath = normalizePath(page.filename ?? '')
                        const fileName = normalPath.startsWith('/') ? normalPath.replace('/', '') : normalPath
                        // pluginContext.emitFIle?
                        emittedFiles.push({
                            fileName,
                            removeFileName: originalFileName,
                            type: 'asset',
                            source: _html
                        })
                    }
                })
                return {
                    html: _html,
                    tags: []
                }
            }
        },
        closeBundle() {
            if (!isProduction(viteConfig.mode)) return
            const root = slash(viteConfig.root || process.cwd())
            const dest = slash(viteConfig.build.outDir || 'dist')
            emittedFiles.forEach(emittedFile => {
                const { fileName, removeFileName, source } = emittedFile
                const outputFileName = path.join(root, dest, fileName)
                const removeFilePath = path.join(root, dest, removeFileName.split('/').filter(Boolean)?.[0])
                fs.rmSync(removeFilePath, { recursive: true, force: true })
                writeFile(outputFileName, source)
            })
        }
    }
}
