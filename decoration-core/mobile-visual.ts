import { mobileDimensionCss, type MobileDimensionUnit } from './mobile-units'

/** Finite public uView glyph names. Preview paths represent the same symbols;
 * admin-library icon names are never treated as image addresses. */
export const MOBILE_ICON_OPTIONS = [
    { label: '无图标', value: '', tags: [] },
    { label: '文字创作', value: 'edit-pen', tags: ['写作', '编辑', '文字', '文案'] },
    { label: '图片', value: 'photo', tags: ['图片', '绘图', '照片', '图像'] },
    { label: '视频', value: 'play-circle', tags: ['视频', '播放', '短片'] },
    { label: '应用', value: 'grid', tags: ['应用', '工具', '宫格'] },
    { label: '账户', value: 'account', tags: ['账户', '用户', '个人'] },
    { label: '客服', value: 'kefu-ermai', tags: ['客服', '帮助', '联系'] },
    { label: '音频', value: 'volume-up', tags: ['音频', '音乐', '声音', '朗读'] },
    { label: '搜索', value: 'search', tags: ['搜索', '查找'] },
    { label: '钱包', value: 'rmb-circle', tags: ['钱包', '积分', '余额', '充值'] },
    { label: '设置', value: 'setting', tags: ['设置', '配置'] },
    { label: '收藏', value: 'star', tags: ['收藏', '喜欢', '灵感'] },
    { label: '文件', value: 'file-text', tags: ['文件', '文档', '作品'] },
    { label: '时间', value: 'clock', tags: ['时间', '历史', '最近', '任务'] },
    { label: '日历', value: 'calendar', tags: ['日历', '计划', '日期'] }
]
export const MOBILE_ICON_PATHS: Record<string, string> = {
    'edit-pen': 'M4 16l-1 5 5-1L20 8l-4-4L4 16zm10-10 4 4M4 16l4 4',
    photo: 'M3 4h18v16H3V4zm0 12 6-6 5 5 3-3 4 4M15 8h.01',
    'play-circle': 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0zM10 8l6 4-6 4V8z',
    grid: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z',
    account: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM4 21v-2a8 8 0 0 1 16 0v2',
    'volume-up': 'M3 9h4l5-5v16l-5-5H3V9zm12-2a7 7 0 0 1 0 10m3-13a11 11 0 0 1 0 16',
    search: 'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0zm-2 5 6 6',
    'rmb-circle': 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0zM8 6l4 6 4-6M8 12h8m-8 4h8m-4-4v8',
    setting: 'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3zm7 9a4 4 0 1 1-8 0 4 4 0 0 1 8 0z',
    star: 'M12 2l3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1 3-6z',
    'file-text': 'M4 2h10l6 6v14H4V2zm10 0v6h6M8 12h8m-8 4h8',
    clock: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0zM12 6v6l4 2',
    calendar: 'M3 5h18v17H3V5zm4-3v6m10-6v6M3 10h18M7 14h2m4 0h2m-8 4h2',
    'kefu-ermai': 'M3 13v-2a9 9 0 0 1 18 0v2M3 11h3v7H3v-7zm15 0h3v7h-3v-7zm3 7v1a3 3 0 0 1-3 3h-4'
}
export const mobileEntryWidgetNames = ['creation-entry-grid', 'service-grid', 'app-collection']
export const isMobileEntryWidget = (name: string) => mobileEntryWidgetNames.includes(name)

const imageAddress = (value: string) => /^(?:https?:\/\/|\/|(?:resource|uploads|static)\/|data:image\/|blob:)/i.test(value)
export const mobileRowGraphic = (row: any): { image: any; name: string; path: string; text: string } => {
    const image = row?.image || row?.cover || row?.cover_url
    if (image) return { image, name: '', path: '', text: '' }
    const icon = String(row?.icon || '').trim()
    if (imageAddress(icon)) return { image: icon, name: '', path: '', text: '' }
    if (Object.prototype.hasOwnProperty.call(MOBILE_ICON_PATHS, icon)) return { image: '', name: icon, path: MOBILE_ICON_PATHS[icon], text: '' }
    // Read old literal emoji/symbols, but never display unknown internal names.
    const text = icon && !/[a-zA-Z0-9]/.test(icon) && Array.from(icon).length <= 8 ? icon : ''
    return { image: '', name: '', path: '', text }
}
const bounded = (value: any, fallback: number, min: number, max: number) => {
    const numeric = Number(value)
    return Math.min(max, Math.max(min, Number.isFinite(numeric) && numeric > 0 ? numeric : fallback))
}
export const mobileImageFit = (content: any) => content?.image_fit === 'contain' ? 'contain' : 'cover'
export const mobileVisualStyle = (widget: any, target: MobileDimensionUnit) => {
    const content = widget?.content || {}, styles = widget?.styles || {}
    const text = mobileTextStyle(styles)['--widget-text-color']
    return {
        '--entry-columns': Math.round(bounded(content.columns, 4, 1, 5)),
        '--entry-font-size': mobileDimensionCss(bounded(content.font_size, 13, 10, 24), 'px', target),
        '--entry-icon-size': mobileDimensionCss(bounded(content.icon_size, 84, 32, 160), 'rpx', target),
        '--entry-text-color': text || 'var(--mobile-text, #222)',
        '--entry-description-color': styles.description_color || (text ? `color-mix(in srgb, ${text} 68%, transparent)` : 'var(--mobile-muted-text, #999)'),
        '--entry-card-background': styles.item_background || 'var(--mobile-soft-surface, var(--widget-soft-surface, #f6f7f9))',
        '--entry-image-fit': mobileImageFit(content),
        ...mobileEntryItemStyle(styles, target)
    }
}

// Rendering provenance stays in memory. Normalization historically supplies
// #333333 even when no color was configured; that default must not override
// the existing renderer's title/muted tokens or be written as new metadata.
// Raw own-key intent survives normalization and asset copies without entering saved JSON.
// Primitive flags also remain safe when Vue wraps these styles in a reactive proxy.
const configuredMargins = Symbol('mobile-render-margins')
const marginFlags: Record<string, number> = { margin_top: 1, margin_bottom: 2, margin_horizontal: 4 }
export const rememberMobileMarginProvenance = (normalized: object, source: any) => {
    const flags = source && Object.prototype.hasOwnProperty.call(source, configuredMargins)
        ? source[configuredMargins]
        : Object.entries(marginFlags).reduce((value, [key, flag]) => Object.prototype.hasOwnProperty.call(source || {}, key) ? value | flag : value, 0)
    Object.defineProperty(normalized, configuredMargins, { value: flags, enumerable: false })
}
export const isMobileMarginConfigured = (styles: any, key: string) =>
    Object.prototype.hasOwnProperty.call(styles || {}, configuredMargins)
        ? Boolean(styles[configuredMargins] & marginFlags[key])
        : Object.prototype.hasOwnProperty.call(styles || {}, key)
const configuredColor = Symbol('mobile-render-color')
export const rememberMobileColor = (normalized: object, source: any, defaults: any = {}) => {
    const configured = source && Object.prototype.hasOwnProperty.call(source, configuredColor)
        ? source[configuredColor]
        : Object.prototype.hasOwnProperty.call(source || {}, 'color') || Object.prototype.hasOwnProperty.call(defaults || {}, 'color')
    Object.defineProperty(normalized, configuredColor, { value: configured, enumerable: false })
}
export const mobileTextStyle = (styles: any = {}) => {
    const configured = Object.prototype.hasOwnProperty.call(styles, configuredColor) ? styles[configuredColor] : Object.prototype.hasOwnProperty.call(styles, 'color')
    const color = configured && styles.color ? String(styles.color) : undefined
    return {
        '--widget-text-color': color,
        '--widget-muted-color': styles.description_color || (color ? `color-mix(in srgb, ${color} 68%, transparent)` : undefined)
    }
}

export const copyMobileColorProvenance = (normalized: object, source: any) => {
    if (source && Object.prototype.hasOwnProperty.call(source, configuredColor)) rememberMobileColor(normalized, source)
    if (source && Object.prototype.hasOwnProperty.call(source, configuredMargins)) rememberMobileMarginProvenance(normalized, source)
}

/** Optional controls: omitted values keep each client's historical geometry. */
export const MOBILE_ENTRY_ITEM_FIELDS = [
    {
        key: 'item_padding',
        label: '入口卡片内边距',
        type: 'stepper' as const,
        default: null,
        min: 0,
        max: 120,
        unit: 'rpx',
        help: '每张入口内卡的内边距；未设置保留旧端默认，0表示无内边距。'
    },
    {
        key: 'item_radius',
        label: '入口卡片圆角',
        type: 'stepper' as const,
        default: null,
        min: 0,
        max: 120,
        unit: 'rpx',
        help: '每张入口内卡的圆角；未设置保留旧端默认，0表示直角。'
    },
    {
        key: 'item_min_height',
        label: '入口卡片最小高度',
        type: 'stepper' as const,
        default: 0,
        min: 0,
        max: 800,
        unit: 'rpx',
        help: '每张入口内卡的最小高度；0按内容自然撑开，不是固定高度。'
    }
]
const optionalDimension = (value: any, max: number) => {
    if (value === undefined || value === null || value === '') return undefined
    const number = Number(value)
    return Number.isFinite(number) ? Math.min(max, Math.max(0, number)) : undefined
}
/** Grid dimensions and direct child placement share one bounded integer basis. */
export const mobileGridColumns = (content: any) => {
    const number = Number(content?.columns ?? 12)
    return !Number.isFinite(number) || number === 0 ? 12 : Math.min(12, Math.max(1, Math.floor(number)))
}
export const mobileGridChildStyle = (parentColumns: any, child: any) => {
    if (!(Number(parentColumns) > 0)) return undefined
    const columns = mobileGridColumns({ columns: parentColumns }), styles = child?.styles || {}
    const configured = Object.prototype.hasOwnProperty.call(styles, 'grid_column')
        ? styles.grid_column
        : styles.layout?.grid_column ?? styles.grid?.column ?? child?.content?.grid_column
    const number = Number(configured)
    const span = !Number.isFinite(number) || number === 0 ? columns : Math.min(columns, Math.max(1, Math.floor(number)))
    return { gridColumn: `span ${span}`, minWidth: '0' }
}

/** Only declared grid/horizontal gaps change zero handling; other legacy containers retain their fallback. */
export const mobileContainerGapCss = (widget: any, target: MobileDimensionUnit) => {
    const value = widget?.content?.gap
    let gap = Math.max(0, Number(value || 8))
    if (['grid', 'horizontal-scroll'].includes(widget?.name)) {
        const numeric = typeof value === 'number' || (typeof value === 'string' && value.trim() !== '') ? Number(value) : NaN
        gap = Number.isFinite(numeric) ? Math.max(0, numeric) : 8
    }
    return mobileDimensionCss(gap, 'rpx', target)
}
export const mobileHorizontalBleedStyles = (widget: any, styles: any, target: MobileDimensionUnit) => {
    const viewport: Record<string, string> = {}, row: Record<string, string> = {}
    if (widget?.name === 'horizontal-scroll' && Number(widget.content?.bleed_end) === 1) {
        const padding = Number(styles?.padding_horizontal)
        const size = Number.isFinite(padding) ? Math.max(0, padding) : 0
        const edge = size > 0 ? mobileDimensionCss(size, 'rpx', target) : '0px'
        Object.assign(viewport, { width: `calc(100% + ${edge})`, overflowX: 'auto', minWidth: '0' })
        Object.assign(row, { width: `calc(100% - ${edge})`, display: 'flex', gap: mobileContainerGapCss(widget, target), overflow: 'visible', minWidth: '0' })
    }
    return { viewport, row }
}

/** Width belongs to the nearest horizontal container's direct child only. */
export const mobileHorizontalItemWidth = (widget: any, target: MobileDimensionUnit) => {
    if (widget?.name !== 'horizontal-scroll') return undefined
    const width = optionalDimension(widget.content?.item_width, 1500)
    return width ? mobileDimensionCss(width, 'rpx', target) : undefined
}
export const mobileEntryItemStyle = (styles: any, target: MobileDimensionUnit) => {
    const result: Record<string, string> = {}
    for (const field of MOBILE_ENTRY_ITEM_FIELDS) {
        const value = optionalDimension(styles?.[field.key], field.max)
        if (value !== undefined)
            result['--entry-' + field.key.replace(/_/g, '-')] = mobileDimensionCss(
                value,
                'rpx',
                target
            )
    }
    return result
}
export const mobileTitleTypography = (content: any) => {
    const result: Record<string, string | number> = {}
    for (const [key, variable, min, max] of [
        ['font_size', '--title-font-size', 10, 48],
        ['sub_font_size', '--title-sub-font-size', 10, 24]
    ] as const) {
        const value = optionalDimension(content?.[key], max)
        if (value !== undefined && value > 0) {
            result[variable] = `${Math.max(min, value)}px`
            // Explicit typography must not inherit different admin/H5 host line boxes.
            result[key === 'font_size' ? '--title-line-height' : '--title-sub-line-height'] = 1.5
        }
    }
    if ([400, 500, 600, 700, 800].includes(Number(content?.font_weight)))
        result['--title-font-weight'] = Number(content.font_weight)
    return result
}
export const mobileMediaImageStyle = (widget: any, target: MobileDimensionUnit, hasImage = true) => {
    if (widget?.name !== 'media-card') return {}
    const result: Record<string, string> = {}
    const height = optionalDimension(widget.content?.image_height, 1200)
    if (height && height > 0) Object.assign(result, { height: mobileDimensionCss(height, 'rpx', target), aspectRatio: 'auto' })
    const width = optionalDimension(widget.content?.image_max_width, 1500)
    if (widget.content?.layout !== 'list' && width && width > 0)
        Object.assign(result, { width: mobileDimensionCss(width, 'rpx', target), maxWidth: '100%', marginLeft: 'auto', marginRight: 'auto' })
    const configured = typeof widget.styles?.image_background === 'string' ? widget.styles.image_background.trim() : ''
    const validationColor = configured.replace(/,\s*(\.\d+)\s*\)$/i, ', 0$1)')
    const background = configured.toLowerCase() === 'transparent' ? 'transparent'
        : mobileIconColor({ icon_color: validationColor }) ? configured : undefined
    if (background) {
        result.backgroundColor = background
        if (!hasImage) result.backgroundImage = 'none'
    }
    return result
}
export const mobileMediaCopyStyle = (widget: any) =>
    widget?.name === 'media-card' && ['left', 'center', 'right'].includes(widget.content?.text_align)
        ? { textAlign: widget.content.text_align } : {}

/** Finite color grammar for glyphs; never allow arbitrary CSS or URLs. */
export const mobileIconColor = (styles: any): string | undefined => {
    const value = typeof styles?.icon_color === 'string' ? styles.icon_color.trim() : ''
    if (/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)) return value
    const rgb = value.match(
        /^(rgb|rgba)\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0(?:\.\d+)?|1(?:\.0+)?))?\s*\)$/i
    )
    if (
        rgb &&
        rgb.slice(2, 5).every((part) => Number(part) <= 255) &&
        (rgb[1].toLowerCase() === 'rgba') === Boolean(rgb[5])
    )
        return value
    return undefined
}

export const mobileMediaListStyle = (widget: any, target: MobileDimensionUnit) => {
    if (widget?.name !== 'media-card' || widget.content?.layout !== 'list') return {}
    const width = optionalDimension(widget.content.image_width, 600) || 160
    const gap = optionalDimension(widget.content.image_text_gap, 240)
    return {
        '--media-list-image-width': mobileDimensionCss(width, 'rpx', target),
        ...(gap && gap > 0 ? { '--media-image-text-gap': mobileDimensionCss(gap, 'rpx', target) } : {})
    }
}

export const mobileMediaTypography = (widget: any) => {
    if (widget?.name !== 'media-card') return {}
    const typography = mobileTitleTypography({ ...widget.content, font_size: optionalDimension(widget.content?.font_size, 32) })
    const names: Record<string, string> = {
        '--title-font-size': '--media-title-font-size',
        '--title-sub-font-size': '--media-sub-font-size',
        '--title-font-weight': '--media-title-font-weight',
        '--title-line-height': '--media-title-line-height',
        '--title-sub-line-height': '--media-sub-line-height'
    }
    return {
        ...Object.fromEntries(Object.entries(typography).map(([key, value]) => [names[key], value])),
        ...(typography['--title-line-height'] ? { '--media-title-gap': '7px' } : {}),
        ...(typography['--title-sub-line-height'] ? { '--media-sub-gap': '3px' } : {})
    }
}
