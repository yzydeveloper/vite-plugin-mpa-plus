import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import mpaPlugin from 'vite-plugin-mpa-plus'

export default defineConfig({
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
