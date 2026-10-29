/** Preserve formatted HTML; recover text entered beside the old default HTML. */
export function resolveMobileRichText(content: any = {}) {
    const html = String(content.html ?? '')
    const text = String(content.text ?? '')
    const placeholder = '<p>在这里填写内容</p>'
    if (html && !(html.trim() === placeholder && text && text !== '在这里填写内容')) return html
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\r?\n/g, '<br>')
}

export function isMagicGridContentVisible(item: any) {
    if (!item || [0, '0', false].includes(item.is_show)) return false
    return ['image', 'cover', 'icon', 'title', 'name', 'sub_title', 'desc']
        .some(key => typeof item[key] === 'object' ? !!item[key]?.url || !!item[key]?.uri : !!String(item[key] ?? '').trim())
}

/** CSS backgrounds support all five editor modes, including native-size tiling. */
export function getMagicGridImageStyle(item: any, url: string) {
    const fit = ['cover', 'contain', 'fill', 'auto', 'repeat'].includes(item?.image_fit)
        ? item.image_fit : 'cover'
    return {
        ...(url ? { backgroundImage: `url(${JSON.stringify(url)})` } : {}),
        backgroundSize: fit === 'fill' ? '100% 100%' : fit === 'repeat' ? 'auto' : fit,
        backgroundRepeat: fit === 'repeat' ? 'repeat' : 'no-repeat',
        backgroundPosition: 'center'
    }
}

/** Use the same cell geometry in the editor, H5, and Mini Program. */
export function getMagicGridLayout(content: any, items: any[], edit = false) {
    const columns = Math.max(2, Math.min(8, Math.floor(Number(content?.grid?.columns) || 4)))
    const rows = Math.max(2, Math.min(8, Math.floor(Number(content?.grid?.rows) || 4)))
    const areas = items.filter(item => Number.isFinite(Number(item?.row)) && Number.isFinite(Number(item?.col)))
        .map(item => {
            const row = Math.max(0, Math.min(rows - 1, Math.floor(Number(item.row))))
            const col = Math.max(0, Math.min(columns - 1, Math.floor(Number(item.col))))
            return {
                item, row, col,
                rowSpan: Math.max(1, Math.min(rows - row, Math.floor(Number(item.row_span) || 1))),
                colSpan: Math.max(1, Math.min(columns - col, Math.floor(Number(item.col_span) || 1)))
            }
        })
    const firstRow = edit || !areas.length ? 0 : Math.min(...areas.map(area => area.row))
    const lastRow = edit ? rows : Math.max(firstRow, ...areas.map(area => area.row + area.rowSpan))
    const usedRows = lastRow - firstRow
    return { columns, rows, firstRow, usedRows, heightPercent: usedRows / columns * 100, areas }
}

export function getMagicGridAreaStyle(layout: ReturnType<typeof getMagicGridLayout>, item: any) {
    const area = layout.areas.find(area => area.item === item)
    if (!area || !layout.usedRows) return {}
    return {
        left: `calc(${area.col / layout.columns * 100}% + var(--magic-gap) / 2)`,
        top: `calc(${(area.row - layout.firstRow) / layout.usedRows * 100}% + var(--magic-gap) / 2)`,
        width: `calc(${area.colSpan / layout.columns * 100}% - var(--magic-gap))`,
        height: `calc(${area.rowSpan / layout.usedRows * 100}% - var(--magic-gap))`
    }
}
