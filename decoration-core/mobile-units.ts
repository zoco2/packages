/** Persisted mobile geometry uses the 750-design rpx scale. Typography uses
 * logical px; the editor's 375px canvas must not halve those font values. */
export type MobileDimensionUnit = 'px' | 'rpx'

export const mobileDimensionCss = (value: number, unit: MobileDimensionUnit, target: MobileDimensionUnit): string => {
    const ratio = unit === target ? 1 : unit === 'rpx' ? 0.5 : 2
    return `${value * ratio}${target}`
}

export const mobileContentFieldUnit = (name: string, key: string): string => {
    if (key === 'font_size') return 'px'
    if (key === 'interval' || key === 'delay') return '秒'
    if (key === 'height' && ['search', 'fixed-search'].includes(name)) return 'px'
    if (['height', 'image_height', 'min_height', 'card_width', 'gap', 'icon_size', 'offset_right', 'offset_bottom', 'button_size', 'button_gap'].includes(key)) return 'rpx'
    return ''
}

/** Preserve runtime measurements and defaults; the only corrected result is
 * the former px/2 typography calculation in the editor renderer. */
export const mobileButtonMeasurements = (content: Record<string, any>, styles: Record<string, any>, target: MobileDimensionUnit) => ({
    '--button-gap': mobileDimensionCss(Math.max(0, Number(styles.item_gap) || 0), 'rpx', target),
    '--button-icon-size': mobileDimensionCss(Math.max(20, Number(content.icon_size) || 43), 'rpx', target),
    '--button-font-size': mobileDimensionCss(Math.max(10, Number(content.font_size) || 14), 'px', target)
})

/** Historical notice renderers used a fixed 26rpx regardless of font_size.
 * Opt in only after an explicit editor change, keeping old formal pages intact. */
export const mobileNoticeFontSize = (content: Record<string, any>): number =>
    content.font_size_mode === 'configured' ? Math.max(10, Number(content.font_size) || 14) : 13

export const mobileNoticeFontCss = (content: Record<string, any>, target: MobileDimensionUnit): string =>
    mobileDimensionCss(mobileNoticeFontSize(content), 'px', target)
