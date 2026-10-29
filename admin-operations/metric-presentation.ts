import type { Metric } from './model'
import { formatValue } from './request'

/** Use the API's relative change, never imply a percentage-point difference or a benefit. */
export function metricComparison(metric?: Metric) {
    if (!metric || metric.status !== 'ready')
        return {
            state: 'unavailable',
            label: '来源暂不可用',
            value: '',
            previous: ''
        }
    if (metric.value === null)
        return {
            state: 'empty',
            label:
                metric.key === 'order_average'
                    ? '无付费订单'
                    : '暂无可计算数据',
            value: '',
            previous: ''
        }
    const previous =
        metric.previous === null
            ? ''
            : `上期 ${formatValue(metric.previous, 6)} ${metric.unit}`
    if (metric.change_percent === null)
        return {
            state: 'no-comparison',
            label:
                metric.previous === 0
                    ? '上期为0，不计算增长率'
                    : '暂无可比数据',
            value: '',
            previous
        }
    return {
        state:
            metric.change_percent > 0
                ? 'up'
                : metric.change_percent < 0
                  ? 'down'
                  : 'flat',
        label: metric.unit === '%' ? '相对上期变化' : '较上期',
        value: `${metric.change_percent > 0 ? '+' : ''}${formatValue(metric.change_percent, 2)}%`,
        previous
    }
}

export function formatHeadlineValue(value: unknown, key: string) {
    if (
        value === null ||
        value === undefined ||
        value === '' ||
        !Number.isFinite(Number(value))
    )
        return '—'
    if (key === 'paid_orders') return formatValue(value, 0)
    return Number(value).toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })
}

/** Twelve-column desktop rows: avoid a final 4+1 by splitting that tail into 3+2. */
export function detailColumnSpans(count: number): number[] {
    const spans: number[] = []
    let remaining = Math.max(0, Math.floor(count))
    while (remaining > 0) {
        const columns = remaining === 5 ? 3 : Math.min(remaining, 4)
        spans.push(...Array(columns).fill(12 / columns))
        remaining -= columns
    }
    return spans
}
