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
            pages: {
                app1: {
                    entry: './src/app/app1/index.ts',
                    filename: 'index.html',
                    template: 'src/app/app1/index.html',
                    inject: {
                        data: {
                            title: 'mpa'
                        }
                    }
                },
                app2: {
                    entry: './src/app/app2/index.ts',
                    filename: 'other.html',
                    template: 'src/app/app1/other.html',
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
