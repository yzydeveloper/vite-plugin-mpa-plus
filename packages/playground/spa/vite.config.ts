import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import mpaPlugin from 'vite-plugin-multi-page'

export default defineConfig({
    server: {
        proxy: {
            '/api': 'http://localhost:8080',
        },
    },
    plugins: [
        vue(),
        mpaPlugin({
            entry: 'src/main.ts',
            inject: {
                data: {
                    title: 'spa'
                }
            }
        }),
    ],
})
