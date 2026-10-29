export const MINIPROGRAM_LICENSE_MESSAGE =
    '微信小程序为商业授权专属功能，当前平台尚未开通，请联系平台管理员开通商业授权后使用。'

export function miniprogramEnabled(config: Record<string, any>): boolean {
    return config?.channel_capabilities?.miniprogram?.enabled === true
}

export function isMiniprogramRoute(route: {
    path: string
    query?: Record<string, any>
    meta?: Record<string, any>
}): boolean {
    const path = route.path.replace(/\/+$/, '')
    const query = route.query || {}
    const meta = route.meta || {}
    const perms = String(meta.perms || '').replace(/_/g, '').toLowerCase()
    return /^\/channel\/(?:weapp|miniprogram|open_platform\/(?:miniprogram|versions))(?:\/|$)/.test(path)
        || (path.startsWith('/channel/') && (query.channel === 'miniprogram' || query.type === 'miniprogram'))
        || perms.startsWith('channel.mnpsettings/')
        || ['core_tenant_channel_miniprogram', 'core_open_platform_miniprogram', 'core_open_platform_versions'].includes(meta.sourceMenuKey)
}

export function filterMiniprogramMenus(menus: any[], enabled: boolean, parent = ''): any[] {
    if (enabled) return menus
    return menus.flatMap((menu) => {
        const path = `${parent}/${menu.paths || ''}`.replace(/\/+/g, '/')
        let query = {}
        try { query = JSON.parse(menu.params || '{}') } catch { /* legacy menus may have no JSON params */ }
        const component = String(menu.component || '')
        if (isMiniprogramRoute({ path, query, meta: { perms: menu.perms, sourceMenuKey: menu.source_menu_key } })
            || ['channel/weapp', 'channel/open_platform/miniprogram', 'channel/open_platform/versions'].includes(component)) return []
        if (Array.isArray(menu.children)) {
            const children = filterMiniprogramMenus(menu.children, false, path)
            if (!children.length) return []
            return [{ ...menu, children }]
        }
        return [{ ...menu }]
    })
}
