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

function copyFile(
    from: string,
    to: string
): void {
    const dir = path.dirname(to)
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }
    fs.copyFileSync(from, to)
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
    const emittedFiles: {
        newFileName: string,
        originalFileName: string
    }[] = []
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
                    if (originalFileName.includes(page.template ?? '')) {
                        const normalPath = normalizePath(page.filename ?? '')
                        const newFileName = normalPath.startsWith('/') ? normalPath.replace('/', '') : normalPath

                        emittedFiles.push({
                            newFileName,
                            originalFileName,
                        })
                    }
                })

                return {
                    html: _html,
                    tags: []
                }
            }
        },
        writeBundle() {
            emittedFiles.forEach(emittedFile => {
                // This is really only here to make sure the new filenames appear in the build output
                this.emitFile({
                    fileName: emittedFile.newFileName,
                    type: 'asset',
                    source: 'nothing'
                })
            })
        },
        closeBundle() {
            if(viteConfig.command !== 'build') return
            const root = slash(viteConfig.root || process.cwd())
            const dest = slash(viteConfig.build.outDir || 'dist')

            const dirsToRemove = emittedFiles.map(emittedFile => {
                const { newFileName: fileName, originalFileName: removeFileName } = emittedFile
                const newFileName = path.join(root, dest, fileName)
                const oldFileName = path.join(root, dest, removeFileName)
                copyFile(oldFileName, newFileName)
                const removeDir = path.join(root, dest, removeFileName.split('/').filter(Boolean)?.[0])
                return removeDir
            })

            // use FG to make sure dir is empty https://github.com/vbenjs/vite-plugin-html/blob/841d4ef04c3cf5ff0d4339350ae336aa83aa70ed/packages/core/src/htmlPlugin.ts#L150-L161
            const uniqueDirsToRemove = [...new Set(dirsToRemove)]
            uniqueDirsToRemove.forEach(removePath => {
                fs.rmSync(removePath, { recursive: true, force: true })
            })
        }
    }
}
