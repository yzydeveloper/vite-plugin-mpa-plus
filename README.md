# vite-plugin-mpa

Similar to the [pages](https://cli.vuejs.org/en/config/#pages) option of vue-cli

## Features

- EJS template capability
- Multi-page/Single-page application support
- Support custom entry
- Support custom template
- Support `connect-history-api-fallback`

## Install

```bash
pnpm install vite-plugin-multiple-page
```

## Usage

Add plugin to your vite.config.ts:

### Multi-page application configuration
```ts
import { defineConfig } from 'vite'
import MultiPagePlugin from 'vite-plugin-multiple-page'

export defineConfig({
    MultiPagePlugin({
        pages: {
            app1: {
                entry: 'src/app/app1/index.ts',
                filename: 'index.html',
                template: 'src/app/app1/App.vue',
                inject: {
                    data: {
                        title: "mpa-app1"
                    }
                }
            },
            app2: {
                entry: 'src/app/app2/index.ts',
                filename: 'index.html',
                template: 'src/app/app2/App.vue',
                inject: {
                    data: {
                        title: "mpa-app2"
                    }
                }
            }
        }
    })
})
```

### Signal-page application configuration

```ts
import { defineConfig } from 'vite'
import MultiPagePlugin from 'vite-plugin-multiple-page'

export defineConfig({
    MultiPagePlugin({
        entry: 'src/main.ts',
        inject: {
            data: {
                title: 'spa'
            }
        }
    })
})
```

### historyApiFallback configuration

```ts
import { defineConfig } from 'vite'
import path from 'path'
import mpaPlugin from 'vite-plugin-multiple-page'

export default defineConfig(() => {
    const app = ['app1', 'app2']
    const rewrites = []
    const pages = app.reduce<Record<string, any>>((_pages, pageName) => {
        _pages[pageName] = {
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
            from: `/view-${pageName}`,
            to: path.posix.join('/', `/src/app/${pageName}/index.html`)
        })
        return _pages
    }, {})

    return {
        plugins: [
            mpaPlugin({
                pages,
                historyApiFallback: {
                    rewrites
                }
            }),
        ],
    }
})

```

