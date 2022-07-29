import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import mpaPlugin from 'vite-plugin-multiple-page'

export default defineConfig({
    plugins: [
        vue(),
        mpaPlugin({
            pages: {
                app1: {
                    entry: 'src/app/app1/index.ts',
                    filename: '/pages/app1.html',
                    template: 'src/app/app1/index.html',
                    inject: {
                        data: {
                            title: 'mpa'
                        }
                    }
                },
                app2: {
                    entry: 'src/app/app2/index.ts',
                    filename: '/pages/app2.html',
                    template: 'src/app/app2/index.html',
                    inject: {
                        data: {
                            title: 'mpa'
                        }
                    }
                }
            }
        }),
    ],
})
