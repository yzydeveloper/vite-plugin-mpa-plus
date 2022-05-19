import { defineConfig } from 'tsup'

export default defineConfig(() => ({
    entry: ['src/index.ts'],
    splitting: true,
    clean: true,
    dts: true,
    format: ['esm', 'cjs']
}))
