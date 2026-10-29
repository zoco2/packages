import { hotspotHeightMode, normalizeHotspotArea } from './hotspot'
export { MOBILE_ENTRY_ITEM_FIELDS, MOBILE_ICON_OPTIONS, isMobileEntryWidget } from './mobile-visual'
import { createMobileWidgetContract, mobileDecorationCatalog, type MobileWidgetContract } from './mobile-contract'
import { mobileContentFieldUnit } from './mobile-units'
export type { MobileWidgetContract, DecorationContractField } from './mobile-contract'
export { mobileContentFieldUnit, mobileDimensionCss, mobileButtonMeasurements, mobileNoticeFontSize, mobileNoticeFontCss } from './mobile-units'

export type DecorateTerminal = 'mobile' | 'pc'

export interface DecorateWidgetLayout {
    mode: 'flow' | 'free'
    x: number
    y: number
    w: number
    h: number
    z: number
    locked: boolean
    hidden: boolean
    snap: number
}

export interface DecorateWidgetSchema {
    id?: string
    name: string
    title: string
    content: Record<string, any>
    styles: Record<string, any>
    visibility?: Record<string, any>
    children?: DecorateWidgetSchema[]
}

export interface DecorateWidgetDefinition {
    name: string
    title: string
    category: string
    icon: string
    terminal: DecorateTerminal[]
    support_channels?: string[]
    repeatable?: boolean
    container?: boolean
    data_fields?: string[]
    style_fields?: string[]
    editor_groups?: DecorationFieldGroup[]
    contract?: MobileWidgetContract
    options: () => DecorateWidgetSchema
}

export type DecorationFieldType = 'text' | 'textarea' | 'color' | 'switch' | 'radio' | 'select' | 'stepper' | 'slider' | 'image' | 'link'

export interface DecorationFieldSchema {
    key: string
    label: string
    type: DecorationFieldType
    default?: unknown
    min?: number
    max?: number
    unit?: string
    options?: Array<{ label: string; value: string | number; tags?: string[] }>
    help?: string
    show_if?: { key: string; equals: unknown }
}

export interface DecorationFieldGroup {
    key: string
    label: string
    fields: DecorationFieldSchema[]
}

// Keep the visual baseline consistent across newly added and legacy mobile
// widgets. Explicit widget values still win during normalization.
export const DEFAULT_MOBILE_PADDING = 24
export const DEFAULT_MOBILE_RADIUS = 16
export const DEFAULT_MOBILE_MARGIN = 24
export const DEFAULT_MOBILE_SPACING = 20
export const DEFAULT_MOBILE_SURFACE = 'rgba(255, 255, 255, 0.88)'

/**
 * The editor, H5 renderer and mini-program renderer share these style keys.
 * Legacy `padding` and `border_radius` remain readable through normalization.
 */
export const commonMobileStyleGroups: DecorationFieldGroup[] = [
    {
        key: 'colors', label: '颜色设置', fields: [
            { key: 'background', label: '旧版背景', type: 'color', default: 'transparent' },
            { key: 'background_color', label: '组件背景', type: 'color', default: DEFAULT_MOBILE_SURFACE },
            { key: 'color', label: '文字颜色', type: 'color', default: '#333333' },
            { key: 'border_color', label: '边框颜色', type: 'color', default: '' }
        ]
    },
    {
        key: 'spacing', label: '边距', fields: [
            { key: 'item_gap', label: '图片间距', type: 'stepper', default: 0, min: 0, max: 240 },
            { key: 'padding_top', label: '上边距', type: 'stepper', default: DEFAULT_MOBILE_PADDING, min: 0, max: 240 },
            { key: 'padding_bottom', label: '下边距', type: 'stepper', default: DEFAULT_MOBILE_PADDING, min: 0, max: 240 },
            { key: 'padding_horizontal', label: '左右内边距', type: 'stepper', default: DEFAULT_MOBILE_PADDING, min: 0, max: 240 },
            { key: 'margin_top', label: '上外边距', type: 'stepper', default: DEFAULT_MOBILE_SPACING, min: -480, max: 240 },
            { key: 'margin_horizontal', label: '左右外边距', type: 'stepper', default: DEFAULT_MOBILE_MARGIN, min: 0, max: 240 }
        ]
    },
    {
        key: 'radius', label: '圆角设置', fields: [
            { key: 'radius_top', label: '上圆角', type: 'stepper', default: DEFAULT_MOBILE_RADIUS, min: 0, max: 100 },
            { key: 'radius_right', label: '右圆角', type: 'stepper', default: DEFAULT_MOBILE_RADIUS, min: 0, max: 100 },
            { key: 'radius_bottom', label: '下圆角', type: 'stepper', default: DEFAULT_MOBILE_RADIUS, min: 0, max: 100 },
            { key: 'radius_left', label: '左圆角', type: 'stepper', default: DEFAULT_MOBILE_RADIUS, min: 0, max: 100 }
        ]
    }
]

export const normalizeMobileWidgetStyles = (styles: any = {}, defaults: any = {}) => {
    const source = { ...(defaults || {}), ...(styles || {}) }
    const inputStyles = styles && typeof styles === 'object' ? styles : {}
    const hasInput = (key: string) => Object.prototype.hasOwnProperty.call(inputStyles, key)
    const hasSource = (key: string) => Object.prototype.hasOwnProperty.call(source, key)
    const legacyPadding = hasInput('padding')
        ? numberValue(inputStyles.padding, DEFAULT_MOBILE_PADDING)
        : numberValue(source.padding, DEFAULT_MOBILE_PADDING)
    const legacyRadius = hasInput('border_radius')
        ? numberValue(inputStyles.border_radius, DEFAULT_MOBILE_RADIUS)
        : numberValue(source.border_radius, DEFAULT_MOBILE_RADIUS)
    const numeric = (key: string, fallback: number, legacy?: number, legacyKey?: string) => {
        if (hasInput(key)) return numberValue(inputStyles[key], fallback)
        if (legacy !== undefined && legacyKey && hasSource(legacyKey)) return legacy
        return numberValue(source[key], fallback)
    }
    const opacity = Math.max(0, Math.min(100, numeric('opacity', 100)))
    return {
        ...source,
        background: source.background ?? 'transparent',
        background_color: source.background_color ?? (source.background ?? DEFAULT_MOBILE_SURFACE),
        color: source.color ?? '#333333',
        border_color: source.border_color ?? '',
        appearance: source.appearance ?? 'default',
        item_gap: numeric('item_gap', 0),
        padding_top: numeric('padding_top', DEFAULT_MOBILE_PADDING, legacyPadding, 'padding'),
        padding_bottom: numeric('padding_bottom', DEFAULT_MOBILE_PADDING, legacyPadding, 'padding'),
        padding_horizontal: numeric('padding_horizontal', DEFAULT_MOBILE_PADDING, legacyPadding, 'padding'),
        margin_horizontal: numeric('margin_horizontal', DEFAULT_MOBILE_MARGIN),
        margin_top: numeric('margin_top', DEFAULT_MOBILE_SPACING),
        margin_bottom: numeric('margin_bottom', 0),
        radius_top: numeric('radius_top', DEFAULT_MOBILE_RADIUS, legacyRadius, 'border_radius'),
        radius_right: numeric('radius_right', DEFAULT_MOBILE_RADIUS, legacyRadius, 'border_radius'),
        radius_bottom: numeric('radius_bottom', DEFAULT_MOBILE_RADIUS, legacyRadius, 'border_radius'),
        radius_left: numeric('radius_left', DEFAULT_MOBILE_RADIUS, legacyRadius, 'border_radius'),
        opacity,
    }
}

/** Shared creation defaults; preserve media/utility geometry and old values. */
export const createDefaultMobileWidgetStyles = (name: string, inputStyles: Record<string, any> = {}) => {
    // Materialize the shared baseline at creation time so every new component
    // starts with editable spacing, background and corners.
    const media = ['banner', 'middle-banner', 'user-banner', 'image-hotspot', 'carousel-search'].includes(name)
    const utility = ['spacer', 'divider', 'floating-action'].includes(name)
    const styles = { ...(inputStyles || {}) }
    if (styles.background === '#ffffff') styles.background = DEFAULT_MOBILE_SURFACE
    if (styles.background_color === '#ffffff' && name !== 'search' && name !== 'fixed-search') {
        styles.background_color = DEFAULT_MOBILE_SURFACE
    }
    if (media || utility) {
        styles.background = 'transparent'
        styles.background_color = 'transparent'
        styles.padding_top = 0
        styles.padding_bottom = 0
        styles.padding_horizontal = 0
    }
    if (name === 'search' || name === 'fixed-search') {
        styles.padding_top = 0
        styles.padding_bottom = 0
        styles.padding_horizontal = 0
    }
    if (name === 'user-info') {
        styles.background_gradient = styles.background_gradient || 'linear-gradient(135deg, #1c2541, #35446f)'
        styles.color = styles.color || '#ffffff'
    }
    if (utility) styles.margin_horizontal = 0
    return normalizeMobileWidgetStyles(styles)
}

export const numberValue = (value: any, fallback: number) => {
    // Empty values mean "not configured". Do not let Number('') turn them
    // into zero, otherwise the shared defaults are lost.
    const normalized = String(value ?? '').trim().replace('px', '')
    if (normalized === '') return fallback
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : fallback
}

/** Apply opacity to a background color without fading widget content. */
export const colorWithOpacity = (value: any, opacity: any) => {
    const color = String(value || '').trim()
    const alpha = Math.max(0, Math.min(1, numberValue(opacity, 100) / 100))
    if (alpha === 0) return 'transparent'
    if (!color || alpha >= 1) return color
    const hex = color.match(/^#([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i)
    if (hex) {
        const raw = hex[1]
        const expand = (part: string) => part.length === 1 ? part + part : part
        const short = raw.length <= 4
        const r = parseInt(expand(raw.slice(0, short ? 1 : 2)), 16)
        const g = parseInt(expand(raw.slice(short ? 1 : 2, short ? 2 : 4)), 16)
        const b = parseInt(expand(raw.slice(short ? 2 : 4, short ? 3 : 6)), 16)
        const sourceAlpha = raw.length === 4 || raw.length === 8
            ? parseInt(expand(raw.slice(short ? 3 : 6)), 16) / 255
            : 1
        return `rgba(${r}, ${g}, ${b}, ${(sourceAlpha * alpha).toFixed(3)})`
    }
    const rgb = color.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i)
    if (rgb) {
        const sourceAlpha = rgb[4] === undefined ? 1 : Number(rgb[4])
        const normalizedAlpha = sourceAlpha > 1 ? sourceAlpha / 100 : sourceAlpha
        return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${(normalizedAlpha * alpha).toFixed(3)})`
    }
    return color
}

/** Internal card surfaces follow the widget background without fading content. */
export const mobileWidgetSurfaceColor = (styles: any, color: string) => {
    const normalized = normalizeMobileWidgetStyles(styles)
    const background = normalized.background_color || normalized.background
    const clearColor = /^(transparent|rgba\(\s*[^)]+[,/]\s*0(?:\.0+)?\s*\)|#[\da-f]{6}00|#[\da-f]{3}0)$/i.test(String(background).trim())
    const opacity = clearColor && !normalized.background_gradient && !normalized.background_image
        ? 0 : normalized.opacity
    return colorWithOpacity(color, opacity)
}

export const createWidgetId = (prefix = 'diy') =>
    `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`

// Legacy payloads may not carry an id. Keep their editor identity stable
// across normalization and rerenders for selection and drag operations.
export const createStableWidgetId = (name: string, index: number) =>
    `legacy_${String(name || 'widget').replace(/[^a-zA-Z0-9_-]/g, '_')}_${index}`

export const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value ?? null))

const stableSourceValue = (value: any): any => {
    if (Array.isArray(value)) return value.map(stableSourceValue)
    if (value && typeof value === 'object') {
        return Object.keys(value)
            .sort()
            .reduce((result: Record<string, any>, key) => {
                result[key] = stableSourceValue(value[key])
                return result
            }, {})
    }
    return value
}

/** An explicitly cleared canonical source must never revive its legacy alias. */
export const getDecorationSourceKey = (content: any = {}) =>
    Object.prototype.hasOwnProperty.call(content || {}, 'source_key')
        ? String(content.source_key ?? '')
        : String(content?.source?.key || '')

export const getDecorationSourceParams = (content: any = {}) =>
    Object.prototype.hasOwnProperty.call(content || {}, 'source_params')
        ? content.source_params || {}
        : Object.prototype.hasOwnProperty.call(content || {}, 'source_key')
          ? {}
          : content?.source?.params || {}

/** Resolve a source row using both its key and parameters, with legacy-key fallback. */
export const getResolvedSource = (resolvedSources: Record<string, any>, content: any = {}) => {
    const key = getDecorationSourceKey(content)
    if (!key) return null
    const params = getDecorationSourceParams(content)
    const expected = JSON.stringify(stableSourceValue(params))
    const rows = Object.values(resolvedSources || {})
    const exact = rows.find((row: any) =>
        row && typeof row === 'object' && String(row.key || '') === key &&
        JSON.stringify(stableSourceValue(row.params || {})) === expected
    )
    return exact || resolvedSources?.[key] || null
}

export const getWidgetLayout = (widget: any, index = 0): DecorateWidgetLayout => {
    const styles = widget?.styles || {}
    const layout = styles.layout || {}
    const left = numberValue(styles.left, NaN)
    const top = numberValue(styles.top, NaN)
    const width = numberValue(styles.width, NaN)
    const height = numberValue(styles.height, NaN)
    return {
        mode: layout.mode || (styles.position === 'absolute' ? 'free' : 'flow'),
        x: Number.isFinite(numberValue(layout.x, NaN))
            ? numberValue(layout.x, 0)
            : Number.isFinite(left)
              ? left
              : 40 + index * 8,
        y: Number.isFinite(numberValue(layout.y, NaN))
            ? numberValue(layout.y, 0)
            : Number.isFinite(top)
              ? top
              : 40 + index * 24,
        w: Number.isFinite(numberValue(layout.w, NaN))
            ? numberValue(layout.w, 1120)
            : Number.isFinite(width)
              ? width
              : 1120,
        h: Number.isFinite(numberValue(layout.h, NaN))
            ? numberValue(layout.h, 240)
            : Number.isFinite(height)
              ? height
              : 240,
        z: numberValue(layout.z, index + 1),
        locked: !!layout.locked,
        hidden: !!layout.hidden,
        snap: numberValue(layout.snap, 8)
    }
}

export const withLayout = (
    widget: DecorateWidgetSchema,
    layout: Partial<DecorateWidgetLayout>,
    index = 0
): DecorateWidgetSchema => {
    const current = getWidgetLayout(widget, index)
    return {
        ...widget,
        id: widget.id || createWidgetId(widget.name),
        content: {
            enabled: 1,
            ...(widget.content || {})
        },
        styles: {
            ...(widget.styles || {}),
            layout: {
                ...current,
                ...layout,
                locked: layout.locked ?? current.locked,
                hidden: layout.hidden ?? current.hidden,
                snap: layout.snap ?? current.snap
            }
        }
    }
}

export const pcWidgetDefinitions: DecorateWidgetDefinition[] = [
    {
        name: 'pc-sidebar',
        title: 'PC侧栏',
        category: 'nav',
        icon: 'el-icon-Monitor',
        terminal: ['pc'],
        repeatable: false,
        options: () =>
            withLayout(
                {
                    title: 'PC侧栏',
                    name: 'pc-sidebar',
                    content: {
                        enabled: 1,
                        logo: 'LA',
                        items: [
                            { key: 'inspiration', title: '灵感', path: '/ai' },
                            { key: 'create', title: '创作', path: '/ai/create' },
                            { key: 'short-drama', title: '短剧', path: '' },
                            { key: 'avatar', title: '数字人', path: '/ai/avatar' },
                            { key: 'tools', title: '工具', path: '/ai/tools' },
                            { key: 'assets', title: '资产', path: '/ai/assets' }
                        ],
                        footer: [
                            { key: 'vip', title: '开通会员', path: '/ai/membership' },
                            { key: 'user', title: '个人中心', path: '/user/info' },
                            { key: 'api', title: 'API', path: '' },
                            { key: 'notice', title: '消息', path: '' },
                            { key: 'mobile', title: '手机', path: '' },
                            { key: 'language', title: '语言', path: '' }
                        ]
                    },
                    styles: {}
                },
                { mode: 'flow', x: 0, y: 0, w: 100, h: 900, z: 1, locked: false, hidden: false }
            )
    },
    {
        name: 'pc-home-hero-grid',
        title: '首页功能入口',
        category: 'page',
        icon: 'el-icon-House',
        terminal: ['pc'],
        options: () =>
            withLayout(
                {
                    title: '首页功能入口',
                    name: 'pc-home-hero-grid',
                    content: {
                        enabled: 1,
                        banners: [
                            {
                                title: 'AI 创作介绍',
                                description: '模型、应用、资产与灵感统一入口',
                                image: '',
                                link: { path: '/ai/tools' }
                            },
                            {
                                title: 'AI 工具合集',
                                description: '热门 AI 能力一站式直达',
                                image: '',
                                link: { path: '/ai/create' }
                            },
                            {
                                title: '灵感案例广场',
                                description: '发现案例，一键做同款',
                                image: '',
                                link: { path: '/ai' }
                            }
                        ],
                        features: [
                            { title: 'AI TV', description: '全新功能，助力短剧创作。', image: '', link: { path: '/ai/create' } },
                            { title: '视频生成', description: '创意视频，一键生成', image: '', link: { path: '/ai/create?type=video' } },
                            { title: '图片生成', description: '智能绘制，即刻成图', image: '', link: { path: '/ai/create?type=image' } }
                        ]
                    },
                    styles: {}
                },
                { mode: 'flow', x: 130, y: 42, w: 1884, h: 240, z: 2, locked: false, hidden: false }
            )
    },
    {
        name: 'pc-tool-carousel',
        title: '工具轮播',
        category: 'tool',
        icon: 'el-icon-MagicStick',
        terminal: ['pc'],
        options: () =>
            withLayout(
                {
                    title: '工具轮播',
                    name: 'pc-tool-carousel',
                    content: {
                        enabled: 1,
                        title: '热门工具',
                        source_key: 'ai_tools',
                        source_params: { limit: 12 },
                        data: []
                    },
                    styles: {}
                },
                { mode: 'flow', x: 130, y: 315, w: 1884, h: 400, z: 3, locked: false, hidden: false }
            )
    },
    {
        name: 'pc-case-feed',
        title: '案例流',
        category: 'content',
        icon: 'el-icon-Picture',
        terminal: ['pc'],
        options: () =>
            withLayout(
                {
                    title: '案例流',
                    name: 'pc-case-feed',
                    content: {
                        enabled: 1,
                        title: '案例展示',
                        source_key: 'image_cases',
                        source_params: { limit: 24 },
                        tabs: [
                            { key: 'all', name: '综合' },
                            { key: 'model', name: 'AI模型' },
                            { key: 'app', name: 'AI应用' },
                            { key: 'effect', name: '视频特效' },
                            { key: 'inspiration', name: '灵感' },
                            { key: 'workflow', name: '工作流' }
                        ]
                    },
                    styles: {}
                },
                { mode: 'flow', x: 130, y: 764, w: 1884, h: 520, z: 4, locked: false, hidden: false }
            )
    },
    {
        name: 'pc-rich-media',
        title: '富媒体区块',
        category: 'media',
        icon: 'el-icon-PictureFilled',
        terminal: ['pc'],
        options: () =>
            withLayout(
                {
                    title: '富媒体区块',
                    name: 'pc-rich-media',
                    content: {
                        enabled: 1,
                        title: '图文区块',
                        description: '配置图片、视频、文案和跳转链接',
                        image: '',
                        link: {}
                    },
                    styles: {}
                },
                { mode: 'flow', x: 130, y: 42, w: 760, h: 260, z: 5, locked: false, hidden: false }
            )
    },
    {
        name: 'pc-text',
        title: '文本',
        category: 'content',
        icon: 'el-icon-Document',
        terminal: ['pc'],
        options: () =>
            withLayout(
                {
                    title: '文本',
                    name: 'pc-text',
                    content: { enabled: 1, text: '文本内容' },
                    styles: { color: '#ffffff', font_size: 24, font_weight: 600 }
                },
                { mode: 'flow', x: 130, y: 42, w: 600, h: 80, z: 6, locked: false, hidden: false }
            )
    },
    {
        name: 'pc-button',
        title: '按钮',
        category: 'tool',
        icon: 'el-icon-Mouse',
        terminal: ['pc'],
        options: () =>
            withLayout(
                {
                    title: '按钮',
                    name: 'pc-button',
                    content: { enabled: 1, text: '立即查看', link: { path: '/ai/tools' } },
                    styles: {}
                },
                { mode: 'flow', x: 130, y: 42, w: 180, h: 52, z: 7, locked: false, hidden: false }
            )
    }
]

export const pcWidgetRegistry = Object.fromEntries(pcWidgetDefinitions.map((item) => [item.name, item]))

export const createDefaultPcWidget = (name: string) => {
    const definition = pcWidgetRegistry[name]
    return definition ? cloneJson(definition.options()) : null
}

const legacyPcNames = ['pc-banner', 'pc-hero-entry', 'pc-tool-config']
const requiredPcHomeNames = ['pc-sidebar', 'pc-home-hero-grid', 'pc-tool-carousel', 'pc-case-feed']

const legacyBannerToHeroGrid = (widgets: DecorateWidgetSchema[]) => {
    const banner = widgets.find((item) => item.name === 'pc-banner')
    const hero = widgets.find((item) => item.name === 'pc-hero-entry')
    const base = createDefaultPcWidget('pc-home-hero-grid')!
    const bannerRows = (banner?.content?.data || []).filter((item: any) => item?.is_show !== '0')
    return {
        ...base,
        content: {
            ...base.content,
            banners: bannerRows.length
                ? bannerRows.map((item: any) => ({
                      title: item.title || item.name || 'AI 创作介绍',
                      description: item.description || item.desc || '模型、应用、资产与灵感统一入口',
                      image: item.image || item.cover || '',
                      link: item.link || { path: '/ai/tools' }
                  }))
                : base.content.banners,
            features: [
                {
                    title: hero?.content?.title || 'AI TV',
                    description: hero?.content?.description || '全新功能，助力短剧创作。',
                    image: '',
                    link: hero?.content?.primary_link || { path: '/ai/create' }
                },
                ...(base.content.features || []).slice(1)
            ]
        }
    }
}

const legacyToolConfigToCarousel = (widgets: DecorateWidgetSchema[]) => {
    const toolConfig = widgets.find((item) => item.name === 'pc-tool-config')
    if (!toolConfig) return null
    const base = createDefaultPcWidget('pc-tool-carousel')!
    const rows = Array.isArray(toolConfig.content?.data) ? toolConfig.content.data : []
    const data = rows
        .filter((item: any) => item?.enabled !== 0 && item?.enabled !== false)
        .map((item: any, index: number) => ({
            id: item.id || `legacy-tool-${index}`,
            title: item.title || item.name || `工具 ${index + 1}`,
            description: item.description || item.desc || item.badge || 'AI 工具',
            badge: item.badge || '',
            cover: item.cover || item.image || '',
            path: item.path || item.route || `/ai/tools/${item.id || `tool-card-${index + 1}`}`,
            virtual_use_count: item.virtual_use_count || item.virtualUseCount || ''
        }))
    return {
        ...base,
        content: {
            ...base.content,
            data,
            source_key: data.length ? '' : base.content.source_key,
            source_params: {
                ...(base.content.source_params || {}),
                limit: Math.max(data.length || 0, Number(base.content.source_params?.limit || 12))
            }
        }
    }
}

export const normalizePcDecorationWidgets = (
    value: any[],
    options: { ensureHome?: boolean } = {}
): DecorateWidgetSchema[] => {
    const input = Array.isArray(value) ? cloneJson(value) : []
    if (!input.length) {
        if (options.ensureHome === false) return []
        return requiredPcHomeNames
            .map((name) => createDefaultPcWidget(name))
            .filter(Boolean) as DecorateWidgetSchema[]
    }

    const nonLegacy = input.filter((item) => item?.name && !legacyPcNames.includes(item.name))
    const findModern = (name: string) => nonLegacy.find((item) => item?.name === name)
    const hasLegacyHome = input.some((item) => legacyPcNames.includes(item?.name))
    const migratedHero = legacyBannerToHeroGrid(input)
    const migratedTools = legacyToolConfigToCarousel(input)

    // Home pages retain the established default composition. Custom PC pages
    // must keep only the widgets explicitly configured on that page; injecting
    // the home widgets here made every page render as the same homepage.
    const modern = options.ensureHome === false
        ? [
              ...nonLegacy,
              ...(findModern('pc-home-hero-grid') || !hasLegacyHome ? [] : [migratedHero]),
              ...(findModern('pc-tool-carousel') || !hasLegacyHome || !migratedTools ? [] : [migratedTools])
          ]
        : [
              findModern('pc-sidebar') || createDefaultPcWidget('pc-sidebar'),
              hasLegacyHome ? migratedHero : findModern('pc-home-hero-grid') || migratedHero,
              hasLegacyHome ? migratedTools || findModern('pc-tool-carousel') || createDefaultPcWidget('pc-tool-carousel') : findModern('pc-tool-carousel') || migratedTools || createDefaultPcWidget('pc-tool-carousel'),
              findModern('pc-case-feed') || createDefaultPcWidget('pc-case-feed'),
              ...nonLegacy.filter((item) => !requiredPcHomeNames.includes(item.name))
          ].filter(Boolean)

    return modern.map((item: any, index: number) => {
        const definition = pcWidgetRegistry[item.name]
        const defaults: Partial<DecorateWidgetSchema> = definition?.options?.() || {}
        const merged = {
            ...defaults,
            ...item,
            id: item?.id || createStableWidgetId(item?.name || 'pc', index),
            title: item.title || defaults.title || item.name,
            content: {
                enabled: 1,
                ...(defaults.content || {}),
                ...(item.content || {})
            },
            styles: {
                ...(defaults.styles || {}),
                ...(item.styles || {})
            }
        }
        if (requiredPcHomeNames.includes(String(merged.name))) {
            delete merged.styles.position
            delete merged.styles.left
            delete merged.styles.top
            delete merged.styles.width
            delete merged.styles.height
            if (numberValue(merged.styles.opacity, 100) < 30) {
                delete merged.styles.opacity
            }
        }
        return withLayout(merged, getWidgetLayout(merged, index), index)
    })
}

export const normalizePcPageMeta = (value: any) => {
    const meta = Array.isArray(value) ? value : value ? [value] : []
    const current = meta[0] || {}
    const currentContent = current.content || {}
    const legacyLightBg = ['#f6f8ff', '#F6F8FF', '#eef1f6', '#EEF1F6'].includes(String(currentContent.bg_color || ''))
    return [
        {
            title: '页面配置',
            name: 'page-meta',
            content: {
                pc_width: 1440,
                pc_min_height: 1080,
                bg_type: '1',
                ...currentContent,
                render_mode: 'pc_diy_v2',
                layout_scope: 'full_page',
                bg_color: legacyLightBg ? '#050505' : currentContent.bg_color || '#050505'
            },
            styles: {
                ...(current.styles || {})
            }
        }
    ]
}

const mobileContent = (content: Record<string, any> = {}) => ({
    enabled: 1,
    data_mode: 'manual',
    data: [],
    source_key: '',
    source_params: {},
    field_map: {},
    fallback_data: [],
    ...content
})

const mobileWidget = (
    name: string,
    title: string,
    category: string,
    icon: string,
    content: Record<string, any> = {},
    styles: Record<string, any> = {},
    extra: Partial<DecorateWidgetDefinition> = {}
): DecorateWidgetDefinition => ({
    name,
    title,
    category,
    icon,
    terminal: ['mobile'],
    support_channels: ['h5', 'mp_weixin'],
    data_fields: ['data_mode', 'data', 'source_key', 'source_params', 'field_map', 'fallback_data'],
    style_fields: ['background', 'background_color', 'background_image', 'background_gradient', 'padding', 'padding_top', 'padding_bottom', 'padding_horizontal', 'margin_top', 'margin_bottom', 'margin_horizontal', 'border_radius', 'radius_top', 'radius_right', 'radius_bottom', 'radius_left', 'border_color', 'shadow', 'opacity'],
    options: () => ({
        name,
        title,
        content: mobileContent(content),
        styles: cloneJson({
            ...styles,
            // `padding` and `border_radius` are legacy aliases used by the
            // built-in definitions. Their new-widget baseline is explicit;
            // user-saved values are still preserved by normalization.
            ...(Object.prototype.hasOwnProperty.call(styles, 'padding') ? { padding: DEFAULT_MOBILE_PADDING } : {}),
            ...(Object.prototype.hasOwnProperty.call(styles, 'border_radius') ? { border_radius: DEFAULT_MOBILE_RADIUS } : {})
        })
    }),
    ...extra
})

const contentGroups = (...groups: DecorationFieldGroup[]) => groups
const selectOptions = (values: Array<[string, string | number]>) => values.map(([label, value]) => ({ label, value }))
const imageLayoutGroup: DecorationFieldGroup = {
    key: 'display', label: '展示设置', fields: [
        { key: 'layout', label: '展示方式', type: 'radio', default: 'grid', options: selectOptions([['单列', 'single'], ['双列', 'double'], ['横向滑动', 'scroll'], ['宫格', 'grid']]) },
        { key: 'columns', label: '每行数量', type: 'stepper', default: 4, min: 1, max: 6 },
        { key: 'show_title', label: '显示标题', type: 'switch', default: 1 },
        { key: 'show_sub_title', label: '显示副标题', type: 'switch', default: 1 }
    ]
}

const mediaLayoutGroup: DecorationFieldGroup = {
    ...imageLayoutGroup,
    fields: imageLayoutGroup.fields.map(field => field.key === 'layout'
        ? { ...field, options: [...(field.options || []), { label: '图左文右列表', value: 'list' }] } : field)
}

const entryGroups = contentGroups({ key: 'entries', label: '入口显示', fields: [
    { key: 'show_heading', label: '显示区块标题', type: 'switch', default: 1, help: '仅控制组件区块标题，不影响每个入口的标题文字。' },
    { key: 'columns', label: '每行数量', type: 'stepper', default: 4, min: 1, max: 5 },
    { key: 'font_size', label: '入口字号', type: 'stepper', default: 13, min: 10, max: 24, unit: 'px' },
    { key: 'icon_size', label: '图标尺寸', type: 'stepper', default: 84, min: 32, max: 160, unit: 'rpx' },
    { key: 'show_title', label: '显示入口标题', type: 'switch', default: 1 },
    { key: 'show_sub_title', label: '显示入口说明', type: 'switch', default: 1 },
    { key: 'image_fit', label: '图片适配', type: 'select', default: 'cover', options: selectOptions([['裁剪填满', 'cover'], ['完整显示', 'contain']]) }
] })

const mobileFilterField: DecorationFieldSchema = { key: 'filter_group', label: '本页筛选组', type: 'text', default: '', help: '与本页分类标签使用相同组名；标签按每行filter_key筛选case-feed/gallery行的category或app_code。留空保留跳转。' }
const optionalLayout = (value: string, label: string): DecorationFieldSchema => ({ key: 'layout', label: '组件布局', type: 'select', default: '', options: selectOptions([['沿用旧布局', ''], [label, value]]) })
const profileGroups = contentGroups({ key: 'profile', label: '用户资料布局', fields: [
    optionalLayout('profile', '头像资料'),
    { key: 'default_avatar', label: '默认头像', type: 'image', default: '' },
    { key: 'guest_name', label: '未登录文案', type: 'text', default: '点击登录' },
    { key: 'login_link', label: '登录链接', type: 'link', default: { path: '/pages/login/login' } },
    { key: 'settings_link', label: '设置链接', type: 'link', default: { path: '/pages/user_set/user_set' } },
    { key: 'bind_link', label: '绑定手机链接', type: 'link', default: { path: '/pages/bind_mobile/bind_mobile' } },
    { key: 'bind_label', label: '绑定提示', type: 'text', default: '绑定手机号' },
    { key: 'bound_label', label: '已绑定提示', type: 'text', default: '已绑定手机号' }
] })
const assetStatsGroups = contentGroups({ key: 'assetStats', label: '资产指标布局', fields: [
    optionalLayout('assets', '三列真实资产'),
    { key: 'detail_label', label: '明细文字', type: 'text', default: '资产明细' },
    { key: 'detail_link', label: '明细链接', type: 'link', default: {} },
    { key: 'quota_label', label: '点数文字', type: 'text', default: '可用点数' },
    { key: 'quota_link', label: '点数链接', type: 'link', default: {} },
    { key: 'avatar_label', label: '形象文字', type: 'text', default: '我的形象' },
    { key: 'avatar_link', label: '形象链接', type: 'link', default: {} },
    { key: 'voice_label', label: '声音文字', type: 'text', default: '我的声音' },
    { key: 'voice_link', label: '声音链接', type: 'link', default: {} }
] })
const galleryGroups = contentGroups({ key: 'gallery', label: '作品画廊布局', fields: [
    optionalLayout('gallery', '作品画廊'), mobileFilterField,
    { key: 'show_title', label: '显示区块标题', type: 'switch', default: 1 },
    { key: 'empty_image', label: '空态图片', type: 'image', default: '' },
    { key: 'empty_text', label: '空态文字', type: 'text', default: '暂无作品' },
    { key: 'empty_action_name', label: '空态按钮文字', type: 'text', default: '' },
    { key: 'empty_action_link', label: '空态按钮链接', type: 'link', default: {} }
] })

export const mobileWidgetDefinitions: DecorateWidgetDefinition[] = [
    { name: 'search', title: '搜索框', category: 'basic', icon: 'el-icon-Search', terminal: ['mobile'], support_channels: ['h5', 'mp_weixin'], repeatable: false, editor_groups: contentGroups({ key: 'search', label: '搜索设置', fields: [{ key: 'placeholder', label: '默认文字', type: 'text', default: '请输入关键词搜索' }, { key: 'show_hotword', label: '搜索热词', type: 'switch', default: 0 }, { key: 'show_button', label: '搜索按钮', type: 'switch', default: 1 }, { key: 'height', label: '搜索框高度', type: 'stepper', default: 35, min: 28, max: 88 }] }), options: () => ({ name: 'search', title: '搜索框', content: { enabled: 1, placeholder: '请输入关键词搜索', show_hotword: 0, show_button: 1, height: 35, link: {} }, styles: { background: 'transparent', background_color: '#ffffff', input_background: '#f4f4f4', text_color: '#999999' } }) },
    { name: 'fixed-search', title: '固定搜索框', category: 'basic', icon: 'el-icon-Search', terminal: ['mobile'], support_channels: ['h5', 'mp_weixin'], repeatable: false, editor_groups: contentGroups({ key: 'search', label: '搜索设置', fields: [{ key: 'placeholder', label: '默认文字', type: 'text', default: '请输入关键词搜索' }, { key: 'fixed_position', label: '固定位置', type: 'radio', default: 'top', options: selectOptions([['顶部', 'top'], ['底部', 'bottom']]) }, { key: 'show_button', label: '搜索按钮', type: 'switch', default: 1 }, { key: 'height', label: '搜索框高度', type: 'stepper', default: 35, min: 28, max: 88 }] }), options: () => ({ name: 'fixed-search', title: '固定搜索框', content: mobileContent({ placeholder: '请输入关键词搜索', fixed_position: 'top', show_button: 1, height: 35, link: {} }), styles: { background: 'transparent', background_color: '#ffffff', input_background: '#f4f4f4', text_color: '#999999' } }) },
    { name: 'banner', title: '图片轮播', category: 'media', icon: 'el-icon-Picture', terminal: ['mobile'], support_channels: ['h5', 'mp_weixin'], editor_groups: contentGroups({ key: 'carousel', label: '轮播设置', fields: [{ key: 'autoplay', label: '自动播放', type: 'switch', default: 1 }, { key: 'interval', label: '切换间隔', type: 'stepper', default: 3, min: 1, max: 10 }, { key: 'show_indicator', label: '显示指示器', type: 'switch', default: 1 }, { key: 'show_caption', label: '图像文案', type: 'switch', default: 1, min: 0, max: 1, options: selectOptions([['隐藏', 0], ['显示', 1]]), help: '仅有图轮播：0隐藏，1显示；未设置保留旧端行为（共享有文案/公开无文案）。文字主视觉标题与说明不受影响。' }, { key: 'image_height', label: '图片高度', type: 'stepper', default: 340, min: 120, max: 950 }, { key: 'indicator_bottom', label: '指示器底边距', type: 'stepper', default: 12, min: 0, max: 950, unit: 'rpx', help: '不设置保留旧位置；显式值以rpx计。' }, { key: 'border_radius', label: '轮播圆角', type: 'stepper', default: 14, min: 0, max: 100, unit: 'rpx' }] }), options: () => ({ name: 'banner', title: '首页轮播图', content: { enabled: 1, style: 1, bg_style: 0, autoplay: 1, interval: 3, show_indicator: 1, image_height: 340, data: [{ is_show: '1', image: '', bg: '', name: '', link: {} }], fallback_data: [] }, styles: {} }) },
    { name: 'carousel-search', title: '轮播搜索', category: 'media', icon: 'el-icon-Search', terminal: ['mobile'], support_channels: ['h5', 'mp_weixin'], editor_groups: contentGroups({ key: 'carouselSearch', label: '轮播搜索', fields: [{ key: 'placeholder', label: '默认文字', type: 'text', default: '搜索 AI 工具' }, { key: 'autoplay', label: '自动播放', type: 'switch', default: 1 }, { key: 'interval', label: '切换间隔', type: 'stepper', default: 3, min: 1, max: 10 }, { key: 'show_search', label: '显示搜索框', type: 'switch', default: 1 }] }), options: () => ({ name: 'carousel-search', title: '轮播搜索', content: mobileContent({ placeholder: '搜索 AI 工具', autoplay: 1, interval: 3, show_search: 1, data: [{ image: '', title: '轮播内容', link: {} }] }), styles: {} }) },
    { name: 'nav', title: '图文导航', category: 'nav', icon: 'el-icon-Grid', terminal: ['mobile'], support_channels: ['h5', 'mp_weixin'], editor_groups: contentGroups({ key: 'navigation', label: '导航设置', fields: [{ key: 'style', label: '展示样式', type: 'radio', default: 1, options: selectOptions([['固定显示', 1], ['分页滑动', 2]]) }, { key: 'per_line', label: '每行数量', type: 'stepper', default: 5, min: 1, max: 5 }, { key: 'show_line', label: '显示行数', type: 'stepper', default: 2, min: 1, max: 4 }] }), options: () => ({ name: 'nav', title: '导航菜单', content: { enabled: 1, style: 1, per_line: 5, show_line: 2, data: [{ image: '', name: '导航名称', link: {} }], fallback_data: [] }, styles: {} }) },
    { name: 'news', title: '资讯', category: 'content', icon: 'el-icon-Document', terminal: ['mobile'], support_channels: ['h5', 'mp_weixin'], editor_groups: contentGroups({ key: 'article', label: '资讯设置', fields: [{ key: 'limit', label: '显示数量', type: 'stepper', default: 10, min: 1, max: 30 }, { key: 'show_image', label: '显示图片', type: 'switch', default: 1 }, { key: 'show_desc', label: '显示摘要', type: 'switch', default: 1 }, { key: 'show_time', label: '显示时间', type: 'switch', default: 1 }] }), options: () => ({ name: 'news', title: '资讯', content: { enabled: 1, title: '最新资讯', limit: 10, show_image: 1, show_desc: 1, show_time: 1, show_click: 1, source_key: 'article', source_params: {}, data: [], fallback_data: [] }, styles: { background: '#f8f8f8', title_color: '#101010', text_color: '#333333' } }) },
    { name: 'middle-banner', title: '中部广告', category: 'media', icon: 'el-icon-PictureFilled', terminal: ['mobile'], support_channels: ['h5', 'mp_weixin'], options: () => ({ name: 'middle-banner', title: '首页中部轮播图', content: { enabled: 1, data: [{ is_show: '1', image: '', name: '', link: {} }], fallback_data: [] }, styles: {} }) },
    { name: 'title-bar', title: '标题栏', category: 'basic', icon: 'el-icon-Document', terminal: ['mobile'], support_channels: ['h5', 'mp_weixin'], editor_groups: contentGroups({ key: 'titleTypography', label: '标题字号与字重', fields: [
        { key: 'font_size', label: '主标题字号', type: 'stepper', default: 17, min: 10, max: 48, unit: 'px', help: '主标题的逻辑px字号，不使用HTML标题标签推断大小。' },
        { key: 'more_text', label: '右侧链接文字', type: 'text', default: '', help: '填写文字并设置跳转链接后显示，如全部。' },
        { key: 'sub_font_size', label: '副标题字号', type: 'stepper', default: 12, min: 10, max: 24, unit: 'px' },
        { key: 'font_weight', label: '主标题字重', type: 'select', default: 0, options: selectOptions([['沿用旧端默认', 0], ['常规', 400], ['中等', 500], ['半粗', 600], ['粗体', 700], ['特粗', 800]]), help: '0保留共享预览700/公开端600；明确设置后两端一致。' }
    ] }), options: () => ({ name: 'title-bar', title: '标题栏', content: { enabled: 1, title: '标题', sub_title: '', align: 'left', link: {} }, styles: { background: '#ffffff', color: '#101010', padding_top: DEFAULT_MOBILE_PADDING, padding_bottom: DEFAULT_MOBILE_PADDING } }) },
    { name: 'notice', title: '公告', category: 'basic', icon: 'el-icon-Bell', terminal: ['mobile'], support_channels: ['h5', 'mp_weixin'], editor_groups: contentGroups({ key: 'notice', label: '公告设置', fields: [{ key: 'icon_mode', label: '公告图标', type: 'radio', default: 'system', options: selectOptions([['系统图标', 'system'], ['自定义', 'custom']]) }, { key: 'data_source', label: '数据来源', type: 'radio', default: 'manual', options: selectOptions([['自定义', 'manual'], ['读取系统', 'source']]) }, { key: 'font_size', label: '文字大小', type: 'stepper', default: 14, min: 10, max: 32 }, { key: 'font_weight', label: '文字加粗', type: 'switch', default: 0 }] }), options: () => ({ name: 'notice', title: '公告', content: { enabled: 1, icon: 'el-icon-Bell', icon_mode: 'system', data_source: 'manual', text: '这里是公告内容', font_size: 14, font_weight: 0, link: {} }, styles: { background: 'transparent', background_color: '#fff7e6', color: '#8a5a00', padding_top: DEFAULT_MOBILE_PADDING, padding_bottom: DEFAULT_MOBILE_PADDING, padding_horizontal: DEFAULT_MOBILE_PADDING, radius_top: DEFAULT_MOBILE_RADIUS, radius_right: DEFAULT_MOBILE_RADIUS, radius_bottom: DEFAULT_MOBILE_RADIUS, radius_left: DEFAULT_MOBILE_RADIUS } }) },
    { name: 'list-nav', title: '列表导航', category: 'nav', icon: 'el-icon-Menu', terminal: ['mobile'], support_channels: ['h5', 'mp_weixin'], options: () => ({ name: 'list-nav', title: '列表导航', content: { enabled: 1, data: [{ image: '', name: '导航名称', desc: '', link: {}, is_show: '1' }] }, styles: {} }) },
    { name: 'image-hotspot', title: '图片热区', category: 'media', icon: 'el-icon-Crop', terminal: ['mobile'], support_channels: ['h5', 'mp_weixin'], editor_groups: contentGroups({ key: 'hotspot', label: '图片设置', fields: [{ key: 'crop_x', label: '裁切左位置', type: 'stepper', default: 0, min: 0, max: 100, unit: '%' }, { key: 'crop_y', label: '裁切上位置', type: 'stepper', default: 0, min: 0, max: 100, unit: '%' }, { key: 'crop_width', label: '裁切宽度', type: 'stepper', default: 100, min: 0, max: 100, unit: '%' }, { key: 'crop_height', label: '裁切高度', type: 'stepper', default: 100, min: 0, max: 100, unit: '%' }, { key: 'height_mode', label: '图片高度', type: 'radio', default: 'auto', options: selectOptions([['原图比例', 'auto'], ['指定高度', 'fixed']]) }, { key: 'height', label: '图片高度', type: 'stepper', default: 200, min: 1, max: 2000 }, { key: 'fit', label: '图片裁剪', type: 'select', default: 'cover', options: selectOptions([['覆盖', 'cover'], ['完整显示', 'contain'], ['拉伸', 'fill']]) }] }), options: () => ({ name: 'image-hotspot', title: '图片热区', content: { enabled: 1, height_mode: 'auto', image: '', height: 200, fit: 'cover', areas: [] }, styles: {} }) },
    mobileWidget('image-showcase', '图片展播', 'media', 'el-icon-Film', { ...mobileContent({ data: [{ image: '', title: '图片标题', sub_title: '', tag: '', link: {} }] }), layout: 'double', columns: 2, show_title: 1, show_sub_title: 1 }, { background: '#ffffff', padding: 12 }, { editor_groups: contentGroups(imageLayoutGroup) }),
    { name: 'divider', title: '辅助线', category: 'basic', icon: 'el-icon-Minus', terminal: ['mobile'], support_channels: ['h5', 'mp_weixin'], editor_groups: contentGroups({ key: 'divider', label: '辅助线设置', fields: [{ key: 'style', label: '线条样式', type: 'radio', default: 'solid', options: selectOptions([['实线', 'solid'], ['虚线', 'dashed'], ['点线', 'dotted']]) }, { key: 'height', label: '线条粗细', type: 'stepper', default: 1, min: 1, max: 12 }] }), options: () => ({ name: 'divider', title: '辅助线', content: { enabled: 1, style: 'solid', height: 1 }, styles: { color: '#eeeeee', margin_top: 12, margin_bottom: 12 } }) },
    { name: 'user-info', title: '用户信息', category: 'user', icon: 'el-icon-User', terminal: ['mobile'], support_channels: ['h5', 'mp_weixin'], repeatable: false, options: () => ({ name: 'user-info', title: '用户信息', content: { enabled: 1 }, styles: {} }) },
    { name: 'my-service', title: '我的服务', category: 'user', icon: 'el-icon-Grid', terminal: ['mobile'], support_channels: ['h5', 'mp_weixin'], editor_groups: contentGroups({ key: 'service', label: '服务设置', fields: [{ key: 'style', label: '展示样式', type: 'radio', default: 1, options: selectOptions([['宫格', 1], ['列表', 2]]) }, { key: 'per_line', label: '每行数量', type: 'stepper', default: 4, min: 1, max: 5 }] }), options: () => ({ name: 'my-service', title: '我的服务', content: { enabled: 1, style: 1, per_line: 4, title: '我的服务', data: [{ image: '', name: '导航名称', link: {} }], fallback_data: [] }, styles: {} }) },
    { name: 'user-banner', title: '个人中心广告图', category: 'media', icon: 'el-icon-Picture', terminal: ['mobile'], support_channels: ['h5', 'mp_weixin'], options: () => ({ name: 'user-banner', title: '个人中心广告图', content: { enabled: 1, data: [{ is_show: '1', image: '', name: '', link: {} }], fallback_data: [] }, styles: {} }) },
    { name: 'customer-service', title: '客服', category: 'user', icon: 'el-icon-Service', terminal: ['mobile'], support_channels: ['h5', 'mp_weixin'], repeatable: false, options: () => ({ name: 'customer-service', title: '客服设置', content: mobileContent({ title: '添加客服二维码', time: '', mobile: '', qrcode: '', remark: '' }), styles: {} }) },

    mobileWidget('rich-text', '富文本', 'basic', 'el-icon-Document', { html: '', text: '' }, { background: '#ffffff', padding: 14 }),
    mobileWidget('spacer', '辅助空白', 'basic', 'el-icon-Minus', { height: 24 }, { background: 'transparent' }, { editor_groups: contentGroups({ key: 'spacer', label: '空白设置', fields: [{ key: 'height', label: '空白高度', type: 'stepper', default: 24, min: 8, max: 300 }] }) }),
    mobileWidget('audio-player', '音频播放', 'basic', 'el-icon-Headset', { title: '音频标题', audio_url: '', cover: '', autoplay: 0, loop: 0 }, { background: '#ffffff', padding: 12 }, { editor_groups: contentGroups({ key: 'audio', label: '音频设置', fields: [{ key: 'title', label: '标题', type: 'text', default: '音频标题' }, { key: 'audio_url', label: '音频地址', type: 'text', default: '' }, { key: 'cover', label: '封面图片', type: 'image', default: '' }, { key: 'autoplay', label: '自动播放', type: 'switch', default: 0 }, { key: 'loop', label: '循环播放', type: 'switch', default: 0 }] }) }),
    mobileWidget('button-group', '按钮组', 'basic', 'el-icon-Mouse', {
        button_style: 'image_text',
        button_shape: 'rounded',
        button_type: 'image',
        display_style: 'fixed',
        font_size: 14,
        font_weight: 0,
        icon_size: 43,
        columns: 4,
        data: Array.from({ length: 4 }, (_, index) => ({
            id: `button_${index + 1}`,
            image: '',
            icon: '●',
            title: '按钮文字',
            tag_enabled: index === 0 ? 1 : 0,
            tag: index === 0 ? '热门' : '',
            tag_background: '#f83287',
            tag_color: '#ffffff',
            is_show: '1',
            link: {}
        }))
    }, {
        background: 'transparent',
        background_color: 'transparent',
        color: '#333333',
        item_gap: 8,
        padding_top: DEFAULT_MOBILE_PADDING,
        padding_bottom: DEFAULT_MOBILE_PADDING,
        padding_horizontal: DEFAULT_MOBILE_PADDING
    }, {
        editor_groups: contentGroups({
            key: 'button', label: '按钮设置', fields: [
                { key: 'button_style', label: '按钮样式', type: 'radio', default: 'image_text', options: selectOptions([['图片+文字', 'image_text'], ['图片', 'image'], ['文字', 'text']]) },
                { key: 'button_shape', label: '按钮形状', type: 'radio', default: 'rounded', options: selectOptions([['直角', 'square'], ['圆角', 'rounded'], ['圆形', 'circle']]) },
                { key: 'button_type', label: '按钮类型', type: 'radio', default: 'image', options: selectOptions([['图片', 'image'], ['图标', 'icon']]) },
                { key: 'display_style', label: '组件风格', type: 'radio', default: 'fixed', options: selectOptions([['固定显示', 'fixed'], ['单行滑动', 'scroll'], ['分页滑动', 'page']]) },
                { key: 'font_size', label: '字体大小', type: 'stepper', default: 14, min: 10, max: 32 },
                { key: 'font_weight', label: '文字加粗', type: 'switch', default: 0 },
                { key: 'icon_size', label: '图标大小', type: 'stepper', default: 43, min: 20, max: 120 },
                { key: 'columns', label: '每行数量', type: 'radio', default: 4, options: selectOptions([['3个', 3], ['4个', 4], ['5个', 5]]) }
            ]
        })
    }),
    mobileWidget('tabs', '分类标签', 'basic', 'el-icon-CollectionTag', { active: 0, data: [{ title: '推荐', link: {} }, { title: '图片', link: {} }, { title: '视频', link: {} }] }, { background: '#ffffff', padding: 12 }, { editor_groups: contentGroups({ key: 'tabs', label: '标签设置', fields: [{ key: 'variant', label: '标签样式', type: 'select', default: '', options: selectOptions([['沿用旧样式', ''], ['下划线', 'underline']]) }, mobileFilterField, { key: 'active', label: '初始标签序号', type: 'stepper', default: 0, min: 0, max: 49 }] }) }),
    mobileWidget('video-player', '视频播放', 'basic', 'el-icon-VideoPlay', { title: '视频标题', video_url: '', cover: '', aspect_ratio: '16:9', show_controls: 1, autoplay: 0 }, { background: '#ffffff', padding: 12, border_radius: 8 }, { editor_groups: contentGroups({ key: 'video', label: '视频设置', fields: [{ key: 'video_url', label: '视频地址', type: 'text', default: '' }, { key: 'cover', label: '封面图片', type: 'image', default: '' }, { key: 'aspect_ratio', label: '视频比例', type: 'select', default: '16:9', options: selectOptions([['16:9', '16:9'], ['4:3', '4:3'], ['1:1', '1:1']]) }, { key: 'show_controls', label: '显示控件', type: 'switch', default: 1 }, { key: 'autoplay', label: '自动播放', type: 'switch', default: 0 }] }) }),
    mobileWidget('floating-action', '浮动按钮', 'basic', 'el-icon-Position', {
        position: 'right-bottom',
        offset_right: 20,
        offset_bottom: 72,
        button_size: 84,
        button_gap: 16,
        button_shape: 'rounded',
        data: [{ type: 'link', icon_mode: 'system', icon: 'auto', icon_image: '', title: '创作', show_text: '1', link: {}, is_show: '1' }]
    }, { background: '#2f80ed', color: '#ffffff', border_radius: 24 }),
    mobileWidget('popup-promo', '弹窗广告', 'basic', 'el-icon-Promotion', { image: '', title: '活动推广', desc: '', link: {}, trigger: 'once', delay: 0, closeable: 1 }, { background: '#ffffff', border_radius: 12 }, { editor_groups: contentGroups({ key: 'popup', label: '弹窗设置', fields: [{ key: 'image', label: '广告图片', type: 'image', default: '' }, { key: 'title', label: '标题', type: 'text', default: '活动推广' }, { key: 'desc', label: '说明', type: 'textarea', default: '' }, { key: 'link', label: '跳转链接', type: 'link', default: {} }, { key: 'trigger', label: '显示类型', type: 'radio', default: 'once', options: selectOptions([['仅首次', 'once'], ['多次', 'repeat']]) }, { key: 'delay', label: '展示延迟', type: 'stepper', default: 0, min: 0, max: 30 }, { key: 'closeable', label: '显示关闭按钮', type: 'switch', default: 1 }] }) }),

    // Containers constrain layout to normal flow, a 12-column grid, or percentage layers.
    mobileWidget('section', '通用容器', 'layout', 'el-icon-Files', {}, { background: '#ffffff', padding: 12, border_radius: 10 }, { container: true }),
    mobileWidget('grid', '栅格容器', 'layout', 'el-icon-Grid', { columns: 12, gap: 8 }, { background: '#ffffff', padding: 12, border_radius: 10 }, { container: true, editor_groups: contentGroups({ key: 'grid', label: '栅格设置', fields: [{ key: 'columns', label: '栅格列数', type: 'stepper', default: 12, min: 1, max: 12 }, { key: 'gap', label: '组件间距', type: 'stepper', default: 8, min: 0, max: 48 }] }) }),
    mobileWidget('stack', '堆叠容器', 'layout', 'el-icon-SetUp', { min_height: 180 }, { background: '#ffffff', padding: 12, border_radius: 10 }, { container: true, editor_groups: contentGroups({ key: 'stack', label: '堆叠设置', fields: [{ key: 'min_height', label: '最小高度', type: 'stepper', default: 180, min: 80, max: 1600 }] }) }),
    mobileWidget('horizontal-scroll', '横滑容器', 'layout', 'el-icon-DArrowRight', { gap: 10 }, { background: '#ffffff', padding: 12 }, { container: true, editor_groups: contentGroups({ key: 'horizontalScroll', label: '横滑设置', fields: [{ key: 'bleed_end', label: '末端延伸', type: 'switch', default: 0, min: 0, max: 1, options: selectOptions([['关闭', 0], ['开启', 1]]), help: '仅本横滑容器：开启后可见轨道向右延伸自身实际水平padding，止于自身border内边界，不越过margin。内部布局仍用原内容宽，保持左起点、78%旧卡宽或显式item_width与gap；0/缺省保留原样。' }, { key: 'gap', label: '组件间距', type: 'stepper', default: 10, min: 0, max: 48 }, { key: 'item_width', label: '子项宽度', type: 'stepper', default: 0, min: 0, max: 1500, unit: 'rpx', help: '仅该横滑容器的直接子组件；0或未填写保留原78%宽度，正值使用rpx，不修改嵌套后代或子组件内部图片宽度。' }] }) }),
    mobileWidget('masonry', '瀑布流容器', 'layout', 'el-icon-Menu', { columns: 2, gap: 10 }, { background: '#ffffff', padding: 12 }, { container: true, editor_groups: contentGroups({ key: 'masonry', label: '瀑布流设置', fields: [{ key: 'columns', label: '显示列数', type: 'stepper', default: 2, min: 2, max: 4 }, { key: 'gap', label: '组件间距', type: 'stepper', default: 10, min: 0, max: 48 }] }) }),
    mobileWidget('card', '卡片容器', 'layout', 'el-icon-Postcard', {}, { background: '#ffffff', padding: 14, border_radius: 12, shadow: '0 4px 16px rgba(0,0,0,.06)' }, { container: true }),

    mobileWidget('image-nav', '图片导航', 'content', 'el-icon-Picture', { per_line: 4, show_line: 2, data: [{ image: '', title: 'AI 图片', sub_title: '', link: {} }] }, { background: '#ffffff', padding: 12 }, { editor_groups: contentGroups({ key: 'imageNav', label: '导航设置', fields: [{ key: 'per_line', label: '每行数量', type: 'stepper', default: 4, min: 1, max: 5 }, { key: 'show_line', label: '显示行数', type: 'stepper', default: 2, min: 1, max: 4 }, { key: 'show_title', label: '显示标题', type: 'switch', default: 1 }, { key: 'show_sub_title', label: '显示副标题', type: 'switch', default: 0 }] }) }),
    mobileWidget('magic-grid', '魔方宫格', 'content', 'el-icon-Grid', { grid: { columns: 4, rows: 4 }, gap: 2, data: [] }, { background: '#ffffff', padding: 10, border_radius: 10 }, { editor_groups: contentGroups({ key: 'magic', label: '魔方设置', fields: [{ key: 'gap', label: '宫格间距', type: 'stepper', default: 2, min: 0, max: 20 }] }) }),
    mobileWidget('tutorial-carousel', '教程横滑', 'content', 'el-icon-VideoPlay', { data: [{ image: '', title: '创作教程', sub_title: '快速掌握 AI 工具', tag: '教程', link: {} }] }, { background: '#ffffff', padding: 12 }, { editor_groups: contentGroups({ key: 'tutorial', label: '教程设置', fields: [{ key: 'card_width', label: '卡片宽度', type: 'stepper', default: 280, min: 180, max: 360 }, { key: 'show_tag', label: '显示标签', type: 'switch', default: 1 }, { key: 'show_sub_title', label: '显示副标题', type: 'switch', default: 1 }] }) }),
    mobileWidget('case-feed', '案例瀑布流', 'content', 'el-icon-PictureFilled', { title: '精选案例', source_key: 'image_cases', source_params: { limit: 12 }, data_mode: 'hybrid' }, { background: '#f7f8fa', padding: 12 }, { editor_groups: contentGroups({ key: 'caseFeed', label: '案例布局', fields: [optionalLayout('masonry', '自然高度双列瀑布流'), mobileFilterField] }) }),
    mobileWidget('app-collection', '应用集合', 'content', 'el-icon-Collection', { title: 'AI 应用', source_key: 'app_entries', source_params: { terminal: 'uniapp' }, data_mode: 'hybrid' }, { background: '#ffffff', padding: 12 }, { editor_groups: entryGroups }),
    mobileWidget('cw-tool-collection', '智能文案集合', 'content', 'el-icon-EditPen', { title: '智能文案', source_key: 'copywriting_tools', source_params: { limit: 12 }, data_mode: 'hybrid' }, { background: '#ffffff', padding: 12 }, { editor_groups: entryGroups }),
    mobileWidget('creation-entry-grid', '创作入口', 'content', 'el-icon-MagicStick', { title: '开始创作', source_key: 'ai_tools', source_params: { limit: 8 }, data_mode: 'hybrid' }, { background: '#ffffff', padding: 12 }, { editor_groups: entryGroups }),
    mobileWidget('recent-tasks', '最近使用', 'content', 'el-icon-Clock', { title: '最近创作', source_key: 'recent_tasks', source_params: { limit: 8 }, data_mode: 'hybrid' }, { background: '#ffffff', padding: 12 }),
    mobileWidget('media-card', '媒体卡片', 'content', 'el-icon-Film', { layout: 'single', data: [{ image: '', title: '媒体标题', sub_title: '', tag: '', link: {} }] }, { background: '#ffffff', padding: 12, border_radius: 10 }, { editor_groups: contentGroups(mediaLayoutGroup, { key: 'mediaTypography', label: '媒体文字', fields: [
        { key: 'text_align', label: '卡内文字对齐', type: 'select', default: '', options: selectOptions([['沿用旧设置', ''], ['左对齐', 'left'], ['居中', 'center'], ['右对齐', 'right']]), help: '仅媒体卡片内部每条标题与说明；不改变外层标题、来源、链接或整张卡点击。空值保留旧CSS。' },
        { key: 'font_size', label: '媒体标题字号', type: 'select', default: 0, min: 0, max: 32, unit: 'px', options: [{ label: '沿用旧默认', value: 0 }, ...Array.from({ length: 23 }, (_, index) => ({ label: `${index + 10}px`, value: index + 10 }))], help: '每行媒体标题，0保留共享13px/公开26rpx；正值只能选10–32逻辑px，两端一致。不是区块标题。' },
        { key: 'sub_font_size', label: '媒体说明字号', type: 'select', default: 0, min: 0, max: 24, unit: 'px', options: [{ label: '沿用旧默认', value: 0 }, ...Array.from({ length: 15 }, (_, index) => ({ label: `${index + 10}px`, value: index + 10 }))], help: '每行媒体说明，0保留共享11px/公开22rpx；正值只能选10–24逻辑px。' },
        { key: 'font_weight', label: '媒体标题字重', type: 'select', default: 0, options: selectOptions([['沿用旧默认', 0], ['常规', 400], ['中等', 500], ['半粗', 600], ['粗体', 700], ['特粗', 800]]), help: '仅每行媒体标题；0保留共享原CSS级联（不新增字重覆盖）/公开继承原字重，显式400–800两端一致。' }
    ] }, { key: 'mediaFit', label: '图片适配', fields: [{ key: 'image_fit', label: '图片缩放', type: 'select', default: 'cover', options: selectOptions([['裁剪填满', 'cover'], ['完整显示', 'contain']]) }, { key: 'image_height', label: '媒体图片高度', type: 'stepper', default: 0, min: 0, max: 1200, unit: 'rpx', help: '明确正值时两端同一图片高度；0/未配置保留共享4:3与公开端210rpx旧默认。仅控制图片，不拉伸文字。' }, { key: 'image_max_width', label: '图片最大宽度', type: 'stepper', default: 0, min: 0, max: 1500, unit: 'rpx', help: '仅非list媒体图片槽；正值不超过父卡宽并居中，0/未填写保留原100%宽。list忽略并继续使用image_width；不改变整卡宽度或其它图片组件。' }, { key: 'image_text_gap', label: '列表图文间距', type: 'stepper', default: 0, min: 0, max: 240, unit: 'rpx', show_if: { key: 'layout', equals: 'list' }, help: '仅media-card list内部图片与文字之间；正值为rpx，0/缺省沿用共享12px、公开24rpx。不是整卡间距；不改变styles.item_gap、来源或整卡点击。' }, { key: 'image_width', label: '列表图片宽度', type: 'stepper', default: 0, min: 0, max: 600, unit: 'rpx', show_if: { key: 'layout', equals: 'list' }, help: '仅图左文右列表的内部图片宽度，0使用160rpx，图片不超过卡宽45%；不控制外部卡宽，其它布局忽略。建议同时明确image_height以使两端一致。' }, { key: 'list_scroll', label: '列表横向滑动', type: 'switch', default: 0, min: 0, max: 1, options: selectOptions([['纵排', 0], ['横滑', 1]]), show_if: { key: 'layout', equals: 'list' }, help: '仅list：0外层纵向列表；1外层横滑露出下一卡，卡内仍左图右文；每张卡宽为容器72%。' }] }) }),

    mobileWidget('user-hero', '用户头图', 'user', 'el-icon-Avatar', { source_key: 'user_profile', data_mode: 'hybrid' }, { background: '#ffffff', padding: 16, border_radius: 12 }, { editor_groups: profileGroups }),
    mobileWidget('membership-card', '会员权益', 'user', 'el-icon-Medal', { source_key: 'membership_summary', data_mode: 'source', link: { path: '/packages/pages/membership/membership' } }, { background: '#1c2541', color: '#ffffff', padding: 16, border_radius: 12 }),
    mobileWidget('commerce-entries', '购买入口', 'user', 'el-icon-Grid', { data: [
        { key: 'credits', title: '算力套餐', sub_title: '购买算力，继续创作', icon: '✦', image: '', link: { path: '/packages/pages/recharge/recharge' } },
        { key: 'distribution', title: '推广中心', sub_title: '邀请好友，共享收益', icon: '↗', image: '', link: { path: '/pages/distribution/distribution' } }
    ] }, { background: 'transparent', color: '#ffffff', padding: 12, border_radius: 12 }),
    mobileWidget('user-stats', '用户指标', 'user', 'el-icon-DataAnalysis', { source_key: 'user_profile', data_mode: 'hybrid' }, { background: '#ffffff', padding: 12 }, { editor_groups: assetStatsGroups }),
    mobileWidget('account-quota', '账户额度', 'user', 'el-icon-Wallet', { source_key: 'account_summary', data_mode: 'hybrid' }, { background: '#ffffff', padding: 14, border_radius: 10 }),
    mobileWidget('asset-entries', '资产入口', 'user', 'el-icon-FolderOpened', { source_key: 'user_assets', data_mode: 'hybrid' }, { background: '#ffffff', padding: 12 }, { editor_groups: galleryGroups }),
    mobileWidget('service-grid', '服务宫格', 'user', 'el-icon-Grid', { data: [{ image: '', title: '我的作品', sub_title: '', link: {} }] }, { background: '#ffffff', padding: 12 }, { editor_groups: entryGroups })
]

// Unit metadata is descriptive only: persisted defaults and payloads stay intact.
mobileWidgetDefinitions.forEach((definition) => {
    definition.editor_groups?.forEach((group) => group.fields.forEach((field) => {
        field.unit ??= mobileContentFieldUnit(definition.name, field.key)
    }))
    // Runtime rendering needs no catalog allocation. Build metadata only when
    // a checker/editor/exporter asks for it; exclude it from library clones.
    let contract: MobileWidgetContract | undefined
    Object.defineProperty(definition, 'contract', { enumerable: false, get: () =>
        contract ??= createMobileWidgetContract(definition, createDefaultMobileWidgetStyles(definition.name, definition.options().styles))
    })
})
export const mobileWidgetRegistry = Object.fromEntries(mobileWidgetDefinitions.map((item) => [item.name, item]))
export const getMobileDecorationCatalog = () => mobileDecorationCatalog(mobileWidgetDefinitions)

const mobileArrayDefaults: Record<string, string[]> = {
    banner: ['data', 'fallback_data'],
    'carousel-search': ['data', 'fallback_data'],
    nav: ['data', 'fallback_data'],
    news: ['data', 'fallback_data'],
    'middle-banner': ['data', 'fallback_data'],
    'list-nav': ['data'],
    'image-hotspot': ['areas'],
    'image-showcase': ['data', 'fallback_data'],
    'my-service': ['data', 'fallback_data'],
    'user-banner': ['data', 'fallback_data'],
    'button-group': ['data', 'fallback_data'],
    tabs: ['data', 'fallback_data'],
    'image-nav': ['data', 'fallback_data'],
    'magic-grid': ['data', 'fallback_data'],
    'tutorial-carousel': ['data', 'fallback_data'],
    'case-feed': ['data', 'fallback_data'],
    'app-collection': ['data', 'fallback_data'],
    'cw-tool-collection': ['data', 'fallback_data'],
    'creation-entry-grid': ['data', 'fallback_data'],
    'recent-tasks': ['data', 'fallback_data'],
    'media-card': ['data', 'fallback_data'],
    'user-hero': ['data', 'fallback_data'],
    'membership-card': ['data', 'fallback_data'],
    'commerce-entries': ['data', 'fallback_data'],
    'user-stats': ['data', 'fallback_data'],
    'account-quota': ['data', 'fallback_data'],
    'asset-entries': ['data', 'fallback_data'],
    'service-grid': ['data', 'fallback_data']
}

export const normalizeMobileWidgetContent = (name: string, content: any = {}, defaults: any = {}) => {
    const next = {
        data_mode: 'manual',
        data: [],
        source_key: '',
        source_params: {},
        field_map: {},
        fallback_data: [],
        ...(defaults || {}),
        ...(content || {})
    }
    if (name === 'image-hotspot') {
        next.height_mode = hotspotHeightMode(content || {})
        next.areas = (Array.isArray(content?.areas) ? content.areas : []).filter((area: any) => area && typeof area === 'object').map(normalizeHotspotArea)
    }
    // Promote the legacy source object only when canonical fields were not saved.
    // Defaults (for example news/article) must not replace an explicit old binding.
    if (!Object.prototype.hasOwnProperty.call(content || {}, 'source_key') && content?.source?.key) {
        next.source_key = String(content.source.key)
        if (!Object.prototype.hasOwnProperty.call(content || {}, 'source_params')) {
            next.source_params = cloneJson(content.source.params || {})
        }
    }
    ;(mobileArrayDefaults[name] || []).forEach((key) => {
        if (!Array.isArray(next[key])) next[key] = Array.isArray(defaults?.[key]) ? cloneJson(defaults[key]) : []
    })
    // Some editor revisions called repeatable rows `areas`. Keep that alias
    // readable so the same published payload renders in H5 and mini-program.
    const areaAliases = new Set(['nav', 'list-nav', 'image-nav', 'service-grid', 'tutorial-carousel', 'button-group', 'image-showcase', 'magic-grid'])
    if (areaAliases.has(name) && (!Array.isArray(next.data) || !next.data.length) && Array.isArray((content || {}).areas)) {
        next.data = cloneJson((content || {}).areas)
    }
    // Existing source widgets predate data_mode and historically preferred the
    // resolved source. Preserve that behavior when opening old templates.
    if (!Object.prototype.hasOwnProperty.call(content || {}, 'data_mode') && next.source_key) {
        next.data_mode = 'hybrid'
    }
    if (name === 'floating-action') {
        // Older drafts used `actions`/`buttons` for the same list. Keep those
        // payloads renderable when the shared protocol is applied.
        if ((!Array.isArray(next.data) || !next.data.length) && Array.isArray((content || {}).actions)) {
            next.data = cloneJson((content || {}).actions)
        }
        if ((!Array.isArray(next.data) || !next.data.length) && Array.isArray((content || {}).buttons)) {
            next.data = cloneJson((content || {}).buttons)
        }
        const legacyAction = {
            type: 'link',
            title: String(next.title || '创作'),
            link: next.link && typeof next.link === 'object' ? next.link : {},
            is_show: '1'
        }
        const actions = Array.isArray(next.data) && next.data.length ? next.data : [legacyAction]
        next.data_mode = 'manual'
        next.data = actions.slice(0, 4).map((action: any, index: number) => ({
            id: action?.id || `floating_action_${index}`,
            type: ['link', 'back_top', 'customer_service', 'phone'].includes(String(action?.type || ''))
                ? action.type
                : 'link',
            icon_mode: action?.icon_mode === 'image' ? 'image' : 'system',
            icon: String(action?.icon || 'auto'),
            icon_image: String(action?.icon_image || ''),
            title: Object.prototype.hasOwnProperty.call(action || {}, 'title')
                ? String(action.title ?? '')
                : String(index === 0 ? next.title || '创作' : '操作'),
            show_text: action?.show_text === '0' || action?.show_text === 0 || action?.show_text === false ? '0' : '1',
            phone: String(action?.phone || ''),
            link: action?.link && typeof action.link === 'object' ? action.link : {},
            is_show: action?.is_show === '0' ? '0' : '1'
        }))
    }
    if (name === 'button-group') {
        const legacyLayout = String(next.layout || '')
        next.button_style = ['image_text', 'image', 'text'].includes(String(next.button_style))
            ? next.button_style
            : 'image_text'
        next.button_shape = ['square', 'rounded', 'circle'].includes(String(next.button_shape))
            ? next.button_shape
            : 'rounded'
        next.button_type = next.button_type === 'icon' ? 'icon' : 'image'
        next.display_style = ['fixed', 'scroll', 'page'].includes(String(next.display_style))
            ? next.display_style
            : (legacyLayout === 'scroll' ? 'scroll' : 'fixed')
        next.font_size = Math.max(10, Math.min(32, Number(next.font_size) || 14))
        next.font_weight = Number(next.font_weight) === 1 ? 1 : 0
        next.icon_size = Math.max(20, Math.min(120, Number(next.icon_size) || 43))
        next.columns = Math.max(1, Math.min(5, Number(next.columns) || 4))
        next.data_mode = 'manual'
        next.data = (Array.isArray(next.data) ? next.data : []).slice(0, 30).map((item: any, index: number) => ({
            ...item,
            id: item?.id || `button_${index + 1}`,
            image: String(item?.image || item?.cover || ''),
            icon: String(item?.icon || '●'),
            title: String(item?.title || item?.name || '按钮文字'),
            tag_enabled: Number(item?.tag_enabled ?? item?.show_tag) === 1 ? 1 : 0,
            tag: String(item?.tag || ''),
            tag_background: String(item?.tag_background || '#f83287'),
            tag_color: String(item?.tag_color || '#ffffff'),
            link: item?.link && typeof item.link === 'object' ? item.link : {},
            is_show: item?.is_show === '0' ? '0' : '1'
        }))
    }
    if (name === 'magic-grid') {
        const grid = next.grid && typeof next.grid === 'object' ? next.grid : {}
        next.grid = {
            columns: Math.max(2, Math.min(8, Number(grid.columns) || 4)),
            rows: Math.max(2, Math.min(8, Number(grid.rows) || 4))
        }
        next.gap = Math.max(0, Math.min(20, Number(next.gap) || 0))
        // Legacy magic grids only contained one-dimensional `span` records.
        // Keep those records untouched so already published templates render as before.
        if (Array.isArray(next.data)) {
            next.data = next.data.map((item: any) => {
                if (!item || typeof item !== 'object') return item
                const hasPosition = Number.isFinite(Number(item.row)) && Number.isFinite(Number(item.col))
                if (!hasPosition) return item
                return {
                    ...item,
                    row: Math.max(0, Math.min(next.grid.rows - 1, Math.floor(Number(item.row)))),
                    col: Math.max(0, Math.min(next.grid.columns - 1, Math.floor(Number(item.col)))),
                    row_span: Math.max(1, Math.min(next.grid.rows, Math.floor(Number(item.row_span) || 1))),
                    col_span: Math.max(1, Math.min(next.grid.columns, Math.floor(Number(item.col_span) || 1)))
                }
            })
        }
    }
    return next
}
