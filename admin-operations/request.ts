/** Discard responses from an earlier filter, tenant, operator or unmounted view. */
export function createRequestScope(identity: () => string) {
    let generation = 0
    return {
        invalidate() {
            generation += 1
        },
        begin() {
            const requestGeneration = ++generation
            const owner = identity()
            return () =>
                requestGeneration === generation && owner === identity()
        }
    }
}

export function validateDateRange(dates: string[] | null): string {
    if (
        !dates ||
        dates.length !== 2 ||
        !dates.every((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
    )
        return '请选择完整的起止日期'
    const start = Date.parse(`${dates[0]}T00:00:00Z`)
    const end = Date.parse(`${dates[1]}T00:00:00Z`)
    if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        new Date(start).toISOString().slice(0, 10) !== dates[0] ||
        new Date(end).toISOString().slice(0, 10) !== dates[1]
    )
        return '请选择有效日期'
    if (end < start) return '结束日期不能早于开始日期'
    if ((end - start) / 86400000 + 1 > 90) return '自定义日期最多支持90天'
    return ''
}

export function formatValue(value: unknown, precision = 0) {
    if (value === null || value === undefined || value === '') return '—'
    const numeric = Number(value)
    return Number.isFinite(numeric)
        ? numeric.toLocaleString('zh-CN', { maximumFractionDigits: precision })
        : '—'
}
