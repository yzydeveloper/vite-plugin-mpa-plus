# vite-plugin-mpa-plus

Similar to the [pages](https://cli.vuejs.org/en/config/#pages) option of vue-cli

## Features

- EJS template capability
- Multi-page/Single-page application support
- Support custom entry
- Support custom template
- Support `connect-history-api-fallback`

## Install

```bash
pnpm install vite-plugin-mpa-plus
```

## Usage

Add plugin to your vite.config.ts:

### Multi-page application configuration
```ts
import { defineConfig } from 'vite'
import mpaPlugin from 'vite-plugin-mpa-plus'

export defineConfig({
    plugins: [
        mpaPlugin({
            pages: {
                app1: {
                    entry: 'src/app/app1/index.ts',
                    filename: '/pages/app1.html',
                    template: 'src/app/app1/index.html',
                    inject: {
                        data: {
                            title: "mpa-app1"
                        }
                    }
                },
                app2: {
                    entry: 'src/app/app2/index.ts',
                    filename: '/pages/app2.html',
                    template: 'src/app/app2/index.html',
                    inject: {
                        data: {
                            title: "mpa-app2"
                        }
                    }
                }
            }
        })
    ]
})
```

### Signal-page application configuration

```ts
import { defineConfig } from 'vite'
import mpaPlugin from 'vite-plugin-mpa-plus'

export defineConfig({
    plugins: [
        mpaPlugin({
            entry: 'src/main.ts',
            inject: {
                data: {
                    title: 'spa'
                }
            }
        })
    ]
})
```

### historyApiFallback configuration

```ts
import type { Rewrite, Pages } from 'vite-plugin-mpa-plus'
import { defineConfig } from 'vite'
import path from 'path'
import mpaPlugin from 'vite-plugin-mpa-plus'

const entrys = ['app1', 'app2']
const rewrites:Rewrite = []
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
        from: `/view-${pageName}`,
        to: `/pages/${pageName}.html`
    })
    return result
}, {})

export default defineConfig(() => {
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

## Development

```sh
# Install all dependencies
pnpm install

# Build or dev core package
pnpm --filter vite-plugin-mpa-plus build
pnpm --filter vite-plugin-mpa-plus dev

# Build playground example
pnpm --filter playground-mpa build

```
