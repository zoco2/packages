export interface OperationsParams {
    range: string
    start_date?: string
    end_date?: string
}
export interface Metric {
    key: string
    label: string
    value: number | null
    previous: number | null
    change_percent: number | null
    unit: string
    source: string
    status: string
    note: string
}
export interface Distribution {
    key: string
    label: string
    unit: string
    status: string
    data: { key: string; name: string; value: number }[]
}
export interface Ranking {
    key: string
    label: string
    unit: string
    status: string
    rows: {
        id: string | number
        name: string
        value: number
        secondary_value?: number
    }[]
}
export interface OperationsData {
    schema_version: number
    scope: 'tenant' | 'platform'
    updated_at: number
    status: string
    range: {
        key: string
        start_date: string
        end_date: string
        bucket: string
        timezone: string
        start_at: number
        end_at: number
    }
    metrics: Metric[]
    trend: {
        labels: string[]
        series: {
            key: string
            label: string
            unit: string
            data: (number | null)[]
        }[]
    }
    distributions: Distribution[]
    rankings: Ranking[]
    sources: { key: string; label: string; status: string; note: string }[]
    warnings: string[]
}
export const snapshotKeys = [
    'tenant_total',
    'tenant_enabled',
    'user_total',
    'tenant_point_balance',
    'user_point_balance',
    'apps_enabled'
]
export const trendGroups = [
    {
        key: 'cash',
        label: '收款与退款',
        unit: '元',
        keys: ['cash_received', 'refund_amount'],
        source: 'payments'
    },
    {
        key: 'tasks',
        label: '任务趋势',
        unit: '个',
        keys: ['task_total', 'task_success', 'task_failed', 'task_running'],
        source: 'tasks'
    },
    {
        key: 'points',
        label: '点数趋势',
        unit: '点',
        keys: [
            'settled_tenant_points',
            'settled_user_points',
            'points_issued',
            'points_consumed',
            'points_returned'
        ],
        source: 'settlements'
    },
    {
        key: 'growth',
        label: '账户增长',
        unit: '',
        keys: ['tenant_new', 'user_new'],
        source: 'accounts'
    }
]
export function chartSummary(
    label: string,
    rows: { name: string; value: number }[],
    unit: string
) {
    if (!rows.length || !rows.some((row) => row.value > 0))
        return `${label}：所选期间暂无数据`
    return `${label}：${rows.map((row) => `${row.name} ${row.value.toLocaleString('zh-CN')} ${unit}`).join('；')}`
}

export type MetricTone = 'primary' | 'success' | 'warning' | 'info'
export interface MetricSection {
    key: string
    label: string
    description: string
    icon:
        | 'wallet'
        | 'task'
        | 'success'
        | 'account'
        | 'points'
        | 'trade'
        | 'activity'
    tone: MetricTone
    metrics: Metric[]
}
/** Organize every received metric exactly once; new API fields remain visible. */
export function organizeMetrics(
    metrics: Metric[],
    scope: 'tenant' | 'platform'
) {
    const highlights = [
        {
            key: 'cash_received',
            label: '已支付订单金额',
            unit: '元',
            icon: 'wallet',
            tone: 'primary'
        },
        {
            key: 'refund_amount',
            label:
                scope === 'platform' ? '已确认额度订单退款' : '已确认订单退款',
            unit: '元',
            icon: 'wallet',
            tone: 'warning'
        },
        {
            key: 'paid_orders',
            label: '外部支付订单数',
            unit: '笔',
            icon: 'trade',
            tone: 'info'
        },
        {
            key: 'order_average',
            label: '客单价',
            unit: '元/笔',
            icon: 'wallet',
            tone: 'success'
        }
    ] as const
    const used = new Set<string>(highlights.map((item) => item.key))
    const snapshots = metrics.filter((item) => snapshotKeys.includes(item.key))
    snapshots.forEach((item) => used.add(item.key))
    const definitions = [
        {
            key: 'points',
            label: scope === 'tenant' ? '点数结算与流转' : '点数结算',
            description: '点数独立统计，不折算为现金收款',
            icon: 'points',
            tone: 'primary',
            keys: [
                'settled_tenant_points',
                'settled_user_points',
                'points_issued',
                'points_consumed',
                'points_returned'
            ]
        },
        {
            key: 'trade',
            label: '交易与开通',
            description: '收款、退款与应用开通分别核对',
            icon: 'trade',
            tone: 'warning',
            keys: ['paid_orders', 'refund_amount', 'app_openings']
        },
        {
            key: 'tasks',
            label: '任务与账户',
            description: '统一任务状态与任务活跃账户',
            icon: 'activity',
            tone: 'success',
            keys: [
                'task_total',
                'task_success_rate',
                'user_new',
                'tenant_new',
                'task_success',
                'task_failed',
                'task_running',
                'active_users',
                'active_tenants'
            ]
        }
    ] as const
    const groups: MetricSection[] = definitions
        .map((def) => {
            const items = def.keys.flatMap((key) =>
                metrics.filter((item) => item.key === key && !used.has(key))
            )
            items.forEach((item) => used.add(item.key))
            return { ...def, metrics: items }
        })
        .filter((group) => group.metrics.length > 0)
    const other = metrics.filter((item) => !used.has(item.key))
    if (other.length)
        groups.push({
            key: 'other',
            label: '其他经营指标',
            description: '其他已接入的真实运营统计',
            icon: 'activity',
            tone: 'info',
            metrics: other
        })
    return {
        highlights: highlights.map((item) => ({
            ...item,
            metric: metrics.find((metric) => metric.key === item.key)
        })),
        groups,
        snapshots
    }
}
