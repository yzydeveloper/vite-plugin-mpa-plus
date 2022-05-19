import type { HtmlTagDescriptor } from 'vite'
import type { Options as EJSOptions } from 'ejs'

export interface InjectOptions {
    /**
     *  @description Data injected into the html template
     */
    data?: Record<string, any>

    /**
     * @description Tag description
     */
    tags?: HtmlTagDescriptor[]

    /**
     * @description esj options configuration
     */
    ejsOptions?: EJSOptions
}

export interface PageOption {
    entry?: string
    filename: string
    template: string
    inject?: InjectOptions
}

export type Pages = Record<string, PageOption>

export interface PluginMultiPageOptions {
    /**
     * @description Page options
     */
    pages?: Pages

    /**
     * @description Page entry
     */
    entry?: string

    /**
     * @description Template path
     */
    template?: string

    /**
     * @description Inject options
     */
    inject?: InjectOptions
}
