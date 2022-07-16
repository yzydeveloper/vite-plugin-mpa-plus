import type { Plugin, ResolvedConfig } from 'vite'
import type { InjectOptions, PluginMultiPageOptions } from './types'
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

function writeFile(filename: string, content: string | Uint8Array): void {
    const dir = path.dirname(filename)
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filename, content)
}

// function emptyDir(dir: string): void {
//     for (const file of fs.readdirSync(dir)) {
//         const abs = path.resolve(dir, file)
//         if (fs.lstatSync(abs).isDirectory()) {
//             emptyDir(abs)
//             fs.rmdirSync(abs)
//         } else {
//             fs.unlinkSync(abs)
//         }
//     }
// }

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

export function createPluginHtmlFix(options: PluginMultiPageOptions): Plugin {
    let viteConfig: ResolvedConfig
    return {
        name: VITE_PLUGIN_NAME,
        configResolved(config) {
            viteConfig = config
        },
        transformIndexHtml: {
            enforce: 'post',
            transform(html) {
                const root = parse(html)
                const nodes = root.querySelectorAll(`[${VITE_PLUGIN_NAME}]`)
                nodes.forEach(node => {
                    const [url, type] = node.getAttribute(VITE_PLUGIN_NAME)?.split(SPLIT_MARK) || []
                    node.setAttribute(type, url)
                })
                const _html = root.toString()
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
            const pages = options.pages || {}
            const { input } = viteConfig.build.rollupOptions
            if (input instanceof Object && !Array.isArray(input)) {
                const filenames: string[] = []
                Object.keys(input).forEach(async key => {
                    const item = input[key]
                    const absolutePath = slash(item) // 获取入口文件的绝对/相对路径
                    const relativePath = normalizePath(absolutePath.replace(`${root}/`, ''))
                    const source = path.join(root, dest, relativePath)
                    const page = pages[key]
                    if (!page) return
                    const output = path.join(root, dest, page.filename) // 根据入口文件路径寻找对应的文件
                    const content = fs.readFileSync(source) // 获取入口文件的内容
                    await writeFile(output, content)

                    filenames.push(page.filename)
                    const [dir] = relativePath.split('/') // 获取要输出的文件目录
                    if (filenames.includes(dir)) return
                    const abs = path.join(root, dest, dir)
                    await fs.rmSync(abs, { recursive: true, force: true })
                })
            }
        }
    }
}
