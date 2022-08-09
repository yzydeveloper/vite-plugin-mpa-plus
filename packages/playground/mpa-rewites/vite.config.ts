import type { Rewrite, Pages } from 'vite-plugin-mpa-plus'
import { defineConfig } from 'vite'
import path from 'path'
import vue from '@vitejs/plugin-vue'
import mpaPlugin from 'vite-plugin-mpa-plus'

const entrys = ['app1', 'app2']
const rewrites: Rewrite[] = []
const pages = entrys.reduce<Pages>((result, pageName) => {
    result[pageName] = {
        entry: `src/app/${pageName}/index.ts`,
        filename: `${pageName}.html`,
        template: `src/app/${pageName}/index.html`,
        inject: {
            data: {
                title: 'mpa'
            }
        }
    }
    rewrites.push({
        from: new RegExp(`^/view-${pageName}$`),
        to: path.posix.join('/', `/src/app/${pageName}/index.html`)
    })
    return result
}, {})

export default defineConfig(() => ({
    plugins: [
        vue(),
        mpaPlugin({
            pages,
            historyApiFallback: {
                rewrites
            }
        }),
    ],
}))
