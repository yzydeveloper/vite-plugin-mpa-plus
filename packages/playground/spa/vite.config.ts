import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import mpaPlugin from 'vite-plugin-multiple-page'

export default defineConfig({
    plugins: [
        vue(),
        mpaPlugin({
            pages: {
                index: {
                    entry: 'src/main.ts',
                    filename: 'index.html',
                    template: 'index.html',
                    inject: {
                        data: {
                            title: 'spa',
                        },
                    },
                },
                two: {
                    entry: 'src/main.ts',
                    filename: 'two.html',
                    template: 'index.html',
                    inject: {
                        data: {
                            title: 'spa',
                        },
                    },
                },
            },
        }),
    ],
})
