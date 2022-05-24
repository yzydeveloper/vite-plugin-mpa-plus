import type { Plugin } from 'vite'
import type { InjectOptions } from './types'
import { parse } from 'node-html-parser'

const VITE_PLUGIN_NAME = 'vite-plugin-html-fix'
const SPLIT_MARK = `_${VITE_PLUGIN_NAME}_`

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

export function createPluginHtmlFix(): Plugin {
    return {
        name: VITE_PLUGIN_NAME,
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
        }
    }
}
