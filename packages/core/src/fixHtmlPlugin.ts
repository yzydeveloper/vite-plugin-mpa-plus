import type { Plugin } from 'vite'
import type { InjectOptions } from './types'
import { parse } from 'node-html-parser'

const VITE_PLUGIN_NAME = 'vite-plugin-fix-html'
const MARK = `_${VITE_PLUGIN_NAME}_`

export function processTags(tags: InjectOptions['tags']): InjectOptions['tags'] {
    const _tags = tags?.map(tag => {
        const { attrs } = tag
        return {
            ...tag,
            attrs: {
                ...attrs,
                ...(attrs?.href ? { href: '' } : {}),
                ...(attrs?.src ? { src: '' } : {}),
                [MARK]: `${attrs?.src || attrs?.href || ''}_${VITE_PLUGIN_NAME}_${attrs?.src ? 'src' : 'href'}`
            }
        }
    })
    return _tags ?? []
}

export function createFixHtmlPlugin(): Plugin {
    return {
        name: VITE_PLUGIN_NAME,
        transformIndexHtml: {
            enforce: 'post',
            transform(html) {
                console.log(parse(html))
                const root = parse(html)
                const nodes = root.querySelectorAll(`[${MARK}]`)
                nodes.forEach(item => {
                    const [url, , type] = item.getAttribute(MARK)?.split(MARK) || []
                })
            }
        }
    }
}
