/** Compatibility for saved templates that still contain a four-column icon sheet. */
export function decorationTabAtlasIndex(row: any, index: number) {
    const value = row?.icon_atlas_index
    return value === '' || value === undefined || value === null ? index : Number(value)
}

export function decorationTabAtlasPosition(index: number, selected: boolean) {
    if (!Number.isInteger(index) || index < 0 || index > 3) return null
    return { left: `${-index * 100}%`, top: selected ? '-100%' : '0%' }
}

/** Independent uploads take priority; untouched legacy states retain their saved crop. */
export function decorationTabIconAtlasPosition(atlas: string, row: any, index: number, selected: boolean) {
    const state = selected ? 'selected' : 'unselected'
    const source = String(row?.[state] || '').trim()
    if (!atlas || row?.icon_atlas_overrides?.[state] || (source && source !== atlas)) return null
    return decorationTabAtlasPosition(row?.atlasIndex ?? decorationTabAtlasIndex(row, index), selected)
}

export function decorationTabbarAppearance(style: Record<string, any> = {}, rows: any[] = [], current = -1) {
    const iconAtlas = String(style.icon_atlas || '').trim()
    const active = iconAtlas ? rows[current] || {} : {}
    const dimension = (value: any, fallback: number) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : fallback
    return {
        iconAtlas,
        barHeight: dimension(style.bar_height, 122),
        iconSize: dimension(style.icon_size, 72),
        backgroundColor: active.background_color || style.background_color || '#ffffff',
        selectedColor: active.selected_color || style.selected_color || '#2f80ed',
        color: style.default_color || '#999999'
    }
}
