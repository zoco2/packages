export { getMobileDecorationImageUrl, resolveMobileAssetImage, mapMobileAssetRows, mapMobileDecorationAssets, mapMobileDecorationMetaAssets } from './mobile-assets'
import { mobileRowGraphic, rememberMobileColor, rememberMobileMarginProvenance } from '../decoration-core/mobile-visual'
export { mobileContainerGapCss, mobileHorizontalBleedStyles, isMobileMarginConfigured, mobileGridColumns, mobileGridChildStyle, mobileHorizontalItemWidth, MOBILE_ENTRY_ITEM_FIELDS, mobileEntryItemStyle, mobileTitleTypography, mobileMediaImageStyle, mobileMediaCopyStyle, mobileMediaListStyle, mobileMediaTypography, mobileIconColor, MOBILE_ICON_OPTIONS, MOBILE_ICON_PATHS, mobileRowGraphic, mobileVisualStyle, mobileImageFit, isMobileEntryWidget, mobileTextStyle } from '../decoration-core/mobile-visual'
import {
    cloneJson,
    colorWithOpacity,
    createDefaultMobileWidgetStyles,
    createStableWidgetId,
    createWidgetId,
    DEFAULT_MOBILE_SURFACE,
    getDecorationSourceKey,
    getDecorationSourceParams,
    getResolvedSource,
    mobileWidgetDefinitions,
    mobileWidgetRegistry,
    mobileWidgetSurfaceColor,
    normalizeMobileWidgetContent,
    normalizeMobileWidgetStyles} from '../decoration-core/index'

export { resolveMobileRichText, isMagicGridContentVisible, getMagicGridLayout, getMagicGridAreaStyle, getMagicGridImageStyle } from '../decoration-core/mobile-content-layout'
export { mobileDimensionCss, mobileButtonMeasurements, mobileNoticeFontSize, mobileNoticeFontCss } from '../decoration-core/mobile-units'
export { MOBILE_DECORATION_FILTER_KEY, mobileFilterKey, mobileFilterRows, mobileMasonryColumns, mobileProfileRow, mobileProfileName, mobileProfileLink, mobileCaseMeta, mobileProfileMobile, mobileProfileStatRows, mobileCaseHeartText } from '../decoration-core/mobile-profile-layout'
export type { MobileDecorationFilters } from '../decoration-core/mobile-profile-layout'
export { hotspotAreas, hotspotAreaStyle, hotspotCropStyle, hotspotHeightMode, hotspotImageMode, runHotspotAction } from '../decoration-core/hotspot'
export { getMobileDecorationCatalog } from '../decoration-core/index'

export {
    mobileWidgetDefinitions,
    mobileWidgetRegistry,
    cloneJson,
    createWidgetId,
    createStableWidgetId,
    colorWithOpacity,
    mobileWidgetSurfaceColor,
    getDecorationSourceKey,
    getDecorationSourceParams,
    getResolvedSource,
    normalizeMobileWidgetStyles
}

export const createDefaultMobileWidget = (name: string) => {
    const definition = mobileWidgetRegistry[name]
    if (!definition) return null
    const widget = cloneJson(definition.options())
    widget.styles = createDefaultMobileWidgetStyles(name, widget.styles)
    return widget
}

const mobileContainerNames = new Set([
    'section',
    'grid',
    'stack',
    'horizontal-scroll',
    'masonry',
    'card'
])

const normalizeAtDepth = (value: any[], depth: number): any[] =>
    (Array.isArray(value) ? value : []).map((item, index) => {
        const defaults = createDefaultMobileWidget(item?.name) || {}
        const defaultStyles = { ...(defaults.styles || {}) }
        if (item?.styles && Object.prototype.hasOwnProperty.call(item.styles, 'background') &&
            !Object.prototype.hasOwnProperty.call(item.styles, 'background_color')) {
            delete defaultStyles.background_color
        }
        const normalized = {
            ...defaults,
            ...item,
            id: item?.id || createStableWidgetId(item?.name || 'mobile', index),
            title: item?.title || defaults.title || item?.name,
            content: {
                ...normalizeMobileWidgetContent(item?.name, item?.content, defaults.content),
                enabled: item?.content?.enabled ?? defaults.content?.enabled ?? 1
            },
            styles: {
                ...normalizeMobileWidgetStyles(item?.styles, defaultStyles)
            },
            sort: item?.sort ?? index
        }
        rememberMobileColor(normalized.styles, item?.styles, mobileWidgetRegistry[item?.name]?.options().styles)
        rememberMobileMarginProvenance(normalized.styles, item?.styles)
        if (mobileContainerNames.has(String(normalized.name))) {
            // A bounded tree keeps malformed legacy JSON from turning into an
            // unbounded render tree while allowing practical nested sections.
            normalized.children = depth < 4 ? normalizeAtDepth(item?.children, depth + 1) : []
        } else if (Array.isArray(item?.children)) {
            // Do not erase unknown legacy fields during a draft save.
            normalized.children = cloneJson(item.children)
        }
        // `disabled` was an editor-only field in older templates. It must not
        // hide or lock a widget after the shared editor protocol was introduced.
        delete (normalized as any).disabled
        return normalized
    })

export const normalizeMobileDecorationWidgets = (value: any[]) => normalizeAtDepth(value, 0)

/** A deliberate editor action. Never run this while reading or publishing legacy pages. */
export const applyImmersiveMobilePreset = (value: any[]): any[] => {
    const media = new Set(['banner', 'middle-banner', 'user-banner', 'image-hotspot', 'carousel-search'])
    const utility = new Set(['spacer', 'divider', 'floating-action'])
    const update = (items: any[]): any[] => (items || []).map((item: any) => {
        const next = cloneJson(item)
        const styles = { ...(next.styles || {}) }
        const transparent = media.has(next.name) || utility.has(next.name)
        if (!styles.background_image && !styles.background_gradient) {
            const cardColor = String(styles.background_color || '').trim().toLowerCase()
            const legacyColor = String(styles.background || '').trim().toLowerCase()
            const isDefaultColor = (color: string) => !color || ['#fff', '#ffffff', 'rgb(255, 255, 255)', 'transparent'].includes(color)
            if (isDefaultColor(cardColor) && isDefaultColor(legacyColor)) {
                styles.background_color = transparent ? 'transparent' : DEFAULT_MOBILE_SURFACE
            }
        }
        if (transparent) {
            for (const key of ['padding_top', 'padding_bottom', 'padding_horizontal']) {
                if (styles[key] === undefined || Number(styles[key]) === 15) styles[key] = 0
            }
        } else {
            for (const key of ['padding_top', 'padding_bottom', 'padding_horizontal']) {
                if (styles[key] === undefined || Number(styles[key]) === 15) styles[key] = 24
            }
        }
        for (const key of ['radius_top', 'radius_right', 'radius_bottom', 'radius_left']) {
            if (styles[key] === undefined || Number(styles[key]) === 5) styles[key] = 16
        }
        if (styles.margin_top === undefined) styles.margin_top = 20
        if (styles.margin_horizontal === undefined) styles.margin_horizontal = utility.has(next.name) ? 0 : 24
        next.styles = styles
        if (Array.isArray(next.children)) next.children = update(next.children)
        return next
    })
    return update(value)
}

/** Existing cover fields only; a video media URL is never an image fallback. */
export const mobileRowImage = (row: any) => row?.image || row?.cover || row?.cover_url || ''

/** Status codes are metadata; only an actual text status can serve as a fallback description. */
export const mobileRowDescription = (row: any) => {
    const description = row?.sub_title || row?.desc || row?.description
    if (description) return description
    const status = typeof row?.status === 'string' ? row.status.trim() : ''
    return status && !Number.isFinite(Number(status)) ? status : ''
}


/** Optional display override for a live application source row. Never merge source identity or routes. */
export const mobileAppSourceGraphic = (widget: any, row: any, resolvedSources: Record<string, any> = {}) => {
    const content = widget?.content || {}, original = () => mobileRowGraphic(row)
    const source = getResolvedSource(resolvedSources, content)
    if (widget?.name !== 'app-collection' || getDecorationSourceKey(content) !== 'app_entries' || content.data_mode === 'manual'
        || !Array.isArray(source?.items) || !source.items.includes(row) || !row?.app_code || !row?.entry_key) return original()
    // First matching tuple wins, including invalid/empty legacy overrides. No entry is ever created.
    const override = Array.isArray(content.source_graphics) ? content.source_graphics.slice(0, 50).find((item: any) =>
        item?.app_code === row.app_code && item?.entry_key === row.entry_key) : null
    if (override?.mode === 'icon') {
        const graphic = mobileRowGraphic({ icon: override.icon })
        return graphic.name ? graphic : original()
    }
    if (override?.mode === 'image' && typeof override.image === 'string' && /^(?:https?:\/\/|\/)(?!\/)/i.test(override.image)) {
        return mobileRowGraphic({ image: override.image })
    }
    return original()
}

/** Preview only knows this controlled login rule. Complex legacy rules remain server-authoritative. */
export const mobileLoginVisibilityPasses = (widget: any, context: Record<string, any> | null | undefined) => {
    if (!['guest', 'logged_in'].includes(context?.login_status)) return true
    const visibility = widget?.visibility ?? widget?.content?.visibility
    const rules = visibility?.rules
    if (!Array.isArray(rules) || rules.length !== 1 || ![undefined, 'all'].includes(visibility?.mode)) return true
    const rule = rules[0]
    if (rule?.field !== 'login_status' || rule?.operator !== 'eq' || !['guest', 'logged_in'].includes(rule?.value)) return true
    return context?.login_status === rule.value
}

/** Rebase unchanged image proofs. Picker file claims remain subject to server validation. */
export const replaceMobileAppSourceContent = (widget: any, content: Record<string, any>, fileClaim?: Record<string, any>) => {
    const next = { ...widget, content }
    if (widget?.name !== 'app-collection') return next
    if (!widget?._decoration_asset_refs && !fileClaim) return next
    const refs = { ...(widget._decoration_asset_refs || {}) }, oldRows = widget.content?.source_graphics, nextRows = content?.source_graphics
    for (const key of Object.keys(refs)) if (/^content\.source_graphics\.\d+\.image$/.test(key)) delete refs[key]
    const used = new Set<number>()
    if (Array.isArray(oldRows) && Array.isArray(nextRows)) oldRows.forEach((row, index) => {
        const proof = widget._decoration_asset_refs?.[`content.source_graphics.${index}.image`]
        if (!row?.app_code || !row?.entry_key || typeof row.image !== 'string' || !row.image || !proof
            || !['file', 'slot'].includes(proof.kind) || !Number.isInteger(proof.id) || proof.id <= 0 || proof.expected_value !== row.image) return
        const target = nextRows.findIndex((entry, nextIndex) => !used.has(nextIndex) && entry?.app_code === row.app_code && entry?.entry_key === row.entry_key && entry?.image === row.image)
        if (target < 0) return
        used.add(target)
        refs[`content.source_graphics.${target}.image`] = { kind: proof.kind, id: proof.id, expected_value: proof.expected_value }
    })
    if (fileClaim && fileClaim.widget_id && fileClaim.widget_id === String(widget.id || '') && Number.isInteger(fileClaim.file_id) && fileClaim.file_id > 0
        && typeof fileClaim.uri === 'string' && /^\/uploads\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp|gif)$/i.test(fileClaim.uri) && !/(?:^|\/)\.\.?(?:\/|$)/.test(fileClaim.uri)) {
        const target = Array.isArray(nextRows) ? nextRows.findIndex(row => row?.app_code === fileClaim.app_code && row?.entry_key === fileClaim.entry_key && row?.mode === 'image' && row?.image === fileClaim.uri) : -1
        const leaf = `content.source_graphics.${target}.image`
        if (target >= 0 && !(refs[leaf]?.kind === 'slot' && refs[leaf]?.expected_value === fileClaim.uri)) refs[leaf] = { kind: 'file', id: fileClaim.file_id, expected_value: fileClaim.uri }
    }
    next._decoration_asset_refs = refs
    return next
}
