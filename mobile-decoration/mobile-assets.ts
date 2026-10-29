import { copyMobileColorProvenance } from '../decoration-core/mobile-visual'

type AssetUrls = Record<string, string> | undefined
const signedImage = (value: string, urls: AssetUrls) => {
    const resolved = urls && Object.prototype.hasOwnProperty.call(urls, value) ? urls[value] : ''
    return typeof resolved === 'string' && /^https?:\/\//i.test(resolved) ? resolved : ''
}
/** Backend-authorized exact references only. Never sign or infer an address. */
export const resolveMobileAssetImage = (value: any, urls: AssetUrls) => {
    if (typeof value === 'string') return signedImage(value, urls) || value
    if (!value || typeof value !== 'object') return value
    for (const key of ['uri', 'path', 'image', 'url']) {
        const resolved = typeof value[key] === 'string' ? signedImage(value[key], urls) : ''
        if (resolved) return { ...value, url: resolved }
    }
    return value
}
const mapSlots = (value: any, keys: string[], urls: AssetUrls) => {
    if (!value || typeof value !== 'object') return value
    const next = { ...value }
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(value, key)) next[key] = resolveMobileAssetImage(value[key], urls)
    }
    return next
}
export const mapMobileAssetRows = (rows: any[], urls: AssetUrls) =>
    (Array.isArray(rows) ? rows : []).map((row) => mapSlots(row, ['image', 'cover', 'cover_url', 'icon_image', 'icon'], urls))

/** Ephemeral render copies: text, routes, IDs, video/audio URLs and source
 * configuration stay raw. Bounded nesting matches the normalizer contract. */
export const mapMobileDecorationAssets = (widgets: any[], urls: AssetUrls, depth = 0): any[] =>
    (Array.isArray(widgets) ? widgets : []).map((widget) => {
        const content = mapSlots(widget?.content, ['image', 'cover', 'qrcode'], urls)
        for (const key of ['data', 'fallback_data']) {
            if (Array.isArray(content?.[key])) content[key] = mapMobileAssetRows(content[key], urls)
        }
        if (widget?.name === 'app-collection' && Array.isArray(content?.source_graphics)) content.source_graphics = content.source_graphics.map((row: any) => mapSlots(row, ['image'], urls))
        const styles = mapSlots(widget?.styles, ['background_image'], urls)
        if (styles) copyMobileColorProvenance(styles, widget?.styles)
        return {
            ...widget,
            ...(content ? { content } : {}),
            ...(styles ? { styles } : {}),
            ...(depth < 4 && Array.isArray(widget?.children) ? { children: mapMobileDecorationAssets(widget.children, urls, depth + 1) } : {})
        }
    })

export const mapMobileDecorationMetaAssets = (meta: any[], urls: AssetUrls) =>
    (Array.isArray(meta) ? meta : []).map((item) => ({ ...item, content: mapSlots(item?.content, ['bg_image', 'title_img'], urls) }))

/** Preserve the exact verified host and signature. Ordinary URLs still use
 * the existing storage adapter; already-mapped render copies are recognized. */
export const getMobileDecorationImageUrl = (value: any, urls: AssetUrls, adapter: (value: any) => string): string => {
    const mapped = resolveMobileAssetImage(value, urls)
    const address = typeof mapped === 'string' ? mapped : mapped?.url || ''
    if (address && (mapped !== value || Object.values(urls || {}).some((url) => url === address && /^https?:\/\//i.test(url)))) return address
    return adapter(value)
}
