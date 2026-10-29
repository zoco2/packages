export type HotspotPoint = { x: number; y: number }
const finite = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
export const hotspotPoint = (clientX: number, clientY: number, bounds: { left: number; top: number; width: number; height: number }): HotspotPoint => ({
    x: clamp((clientX - bounds.left) / Math.max(1, bounds.width) * 100, 0, 100),
    y: clamp((clientY - bounds.top) / Math.max(1, bounds.height) * 100, 0, 100)
})

export const normalizeHotspotArea = (area: Record<string, any> = {}) => {
    const left = clamp(finite(area.left), 0, 99)
    const top = clamp(finite(area.top), 0, 99)
    return { ...area, left, top,
        width: clamp(finite(area.width, 20), 1, 100 - left),
        height: clamp(finite(area.height, 20), 1, 100 - top) }
}
export const hotspotRectangle = (start: HotspotPoint, end: HotspotPoint) => normalizeHotspotArea({
    left: Math.min(start.x, end.x), top: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y)
})
export const moveHotspotArea = (area: Record<string, any>, dx: number, dy: number) => {
    const next = normalizeHotspotArea(area)
    return { ...next, left: clamp(next.left + dx, 0, 100 - next.width), top: clamp(next.top + dy, 0, 100 - next.height) }
}
export const resizeHotspotArea = (area: Record<string, any>, dx: number, dy: number) =>
    normalizeHotspotArea({ ...area, width: finite(area.width) + dx, height: finite(area.height) + dy })
export const hotspotAreaStyle = (area: Record<string, any>) => {
    const value = normalizeHotspotArea(area)
    return { left: `${value.left}%`, top: `${value.top}%`, width: `${value.width}%`, height: `${value.height}%` }
}
export const hotspotHeightMode = (content: Record<string, any>) =>
    content.height_mode === 'auto' ? 'auto' : content.height_mode === 'fixed' || Number(content.height) > 0 ? 'fixed' : 'auto'
// A viewport crops image whitespace without changing the original asset or the
// percentage coordinate system used by the clickable regions.
export const hotspotCropStyle = (content: Record<string, any>) => {
    if (hotspotHeightMode(content) !== 'fixed') return {}
    const x = clamp(finite(content.crop_x), 0, 99)
    const y = clamp(finite(content.crop_y), 0, 99)
    const width = clamp(finite(content.crop_width, 100), 1, 100 - x)
    const height = clamp(finite(content.crop_height, 100), 1, 100 - y)
    if (x === 0 && y === 0 && width === 100 && height === 100) return {}
    return { position: 'absolute' as const, width: `${10000 / width}%`, height: `${10000 / height}%`, left: `${-x / width * 100}%`, top: `${-y / height * 100}%`, objectFit: 'fill' as const }
}
export const hotspotImageMode = (content: Record<string, any>) => hotspotHeightMode(content) === 'auto' ? 'widthFix' :
    content.fit === 'contain' ? 'aspectFit' : content.fit === 'fill' ? 'scaleToFill' : 'aspectFill'
export const hotspotAreas = (content: Record<string, any>) => content.image && Array.isArray(content.areas)
    ? content.areas.slice(0, 30).filter((area: any) => area && area.is_show !== 0 && area.is_show !== '0').map(normalizeHotspotArea) : []

const phone = (value: unknown) => {
    const number = String(value || '').replace(/[\s()-]/g, '')
    return /^\+?\d{3,20}$/.test(number) ? number : ''
}
const decode = (value: string) => { try { return decodeURIComponent(value) } catch { return value } }
export const hotspotHref = (area: Record<string, any>): string => {
    if (area.type === 'phone') return phone(area.phone) ? `tel:${phone(area.phone)}` : ''
    if (area.type && !['link', 'customer_service'].includes(area.type)) return ''
    const link = area.link || {}
    if (link.type === 'mini_program') {
        const query = link.query || {}
        if (!/^wx[a-z\d]+$/i.test(String(query.appId || '')) || !String(query.path || '').trim() || /[\u0000-\u0020\u007f]/.test(String(query.path))) return ''
        return 'weixin://dl/business/?' + Object.entries({ appid: query.appId, path: query.path, env_version: query.env_version || 'release', query: query.query || '' })
            .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`).join('&')
    }
    const path = String(typeof link === 'string' ? link : link.path || link.url || '').trim()
    if (!path || /[\u0000-\u0020\u007f\\]/.test(path) || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(path) && !/^https?:\/\//i.test(path)) return ''
    const [beforeHash, ...hash] = path.split('#')
    const [pathname, ...query] = beforeHash.split('?')
    const values = new Map<string, string>()
    for (const item of query.join('?').split('&').filter(Boolean)) {
        const [key, ...value] = item.split('=')
        values.set(decode(key), decode(value.join('=')))
    }
    const extra = link.query && typeof link.query === 'object' ? link.query : {}
    for (const [key, value] of Object.entries(extra)) if (value != null) values.set(key, String(value))
    if (link.page_code && !values.has('code')) values.set('code', String(link.page_code))
    const suffix = [...values].map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')
    return pathname + (suffix ? `?${suffix}` : '') + (hash.length ? `#${hash.join('#')}` : '')
}
export const runHotspotAction = (area: Record<string, any>, adapters: {
    navigate: (link: any) => void; phone: (number: string) => void; backTop: () => void; customerService: (link?: any) => void
}) => {
    const type = area.type || 'link'
    const href = hotspotHref(area)
    const link = !href ? undefined : area.link?.type === 'mini_program'
        ? { ...area.link, query: { ...area.link.query } }
        : { ...(typeof area.link === 'object' ? area.link : {}), path: href, query: {}, page_code: '' }
    if (type === 'back_top') adapters.backTop()
    else if (type === 'phone' && phone(area.phone)) adapters.phone(phone(area.phone))
    else if (type === 'customer_service') adapters.customerService(link)
    else if (type === 'link' && link) adapters.navigate(link)
}
