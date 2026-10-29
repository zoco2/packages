import { createModuleCode } from 'vite-plugin-svg-icons'
import type { Plugin } from 'vite'

const REGISTER_ID = 'virtual:svg-icons-register'
const NAMES_ID = 'virtual:svg-icons-names'

export function createSvgIconsCompatPlugin(options: {
    iconDirs: string[]
    symbolId?: string
}): Plugin {
    const cache = new Map()
    const svgOptions = {}
    const resolvedOptions = {
        svgoOptions: true,
        symbolId: 'icon-[dir]-[name]',
        inject: 'body-last',
        customDomId: '__svg__icons__dom__',
        ...options
    }

    return {
        name: 'likeadmin:svg-icons-compat',
        enforce: 'pre',
        resolveId(id) {
            if (id === REGISTER_ID || id === NAMES_ID) {
                return id
            }
            return null
        },
        async load(id) {
            if (id !== REGISTER_ID && id !== NAMES_ID) {
                return null
            }
            const { code, idSet } = await createModuleCode(cache, svgOptions, resolvedOptions)
            return id === REGISTER_ID ? code : idSet
        }
    }
}
