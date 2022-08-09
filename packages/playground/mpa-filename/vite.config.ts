import type { Rewrite, Pages } from 'vite-plugin-mpa-plus'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import mpaPlugin from 'vite-plugin-mpa-plus'

const rewrites: Rewrite[] = []
const entrys = ['app1', 'app2']
const pages = entrys.reduce<Pages>((result, pageName) => {
    result[pageName] = {
        entry: `src/app/${pageName}/index.ts`,
        filename: `/pages/${pageName}.html`,
        template: `src/app/${pageName}/index.html`,
        inject: {
            data: {
                title: 'mpa'
            }
        }
    }
    rewrites.push({
        from: new RegExp(`^/${pageName}$`),
        to: `/pages/${pageName}.html`
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
