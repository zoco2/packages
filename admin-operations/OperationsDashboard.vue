<template>
    <div class="operations-dashboard">
        <header class="operations-header">
            <div>
                <h1>{{ scope === 'platform' ? '平台运营' : '经营概览' }}</h1>
                <p>
                    {{
                        scope === 'platform'
                            ? '租户、收款与统一任务的运营情况'
                            : '用户、收款与创作业务的运营情况'
                    }}
                </p>
            </div>
            <div class="refresh-area">
                <span>更新于 {{ updatedText }}</span
                ><el-button :loading="loading" @click="refresh"
                    >刷新数据</el-button
                >
            </div>
        </header>

        <section class="operations-panel filters" aria-label="统计日期筛选">
            <div class="range-buttons">
                <el-radio-group
                    v-model="range"
                    aria-label="统计时间范围"
                    @change="changeRange"
                    ><el-radio-button
                        v-for="item in ranges"
                        :key="item.value"
                        :label="item.value"
                        >{{ item.label }}</el-radio-button
                    ></el-radio-group
                >
            </div>
            <div v-if="range === 'custom'" class="custom-range">
                <el-date-picker
                    v-model="dates"
                    type="daterange"
                    value-format="YYYY-MM-DD"
                    format="YYYY-MM-DD"
                    range-separator="至"
                    start-placeholder="开始日期"
                    end-placeholder="结束日期"
                    :disabled-date="futureDate"
                    aria-label="自定义统计日期"
                /><el-button type="primary" @click="applyDates">查询</el-button>
            </div>
            <p v-if="dateError" class="error-text" role="alert">
                {{ dateError }}
            </p>
            <p class="scope-note">
                {{ rangeText }} · 北京时间 ·
                期间指标按所选日期统计，账户总量与余额为更新时快照
            </p>
        </section>
        <section v-if="error" class="operations-panel failure" role="alert">
            <h2>运营数据加载失败</h2>
            <p>{{ error }}</p>
            <el-button type="primary" @click="refresh">重试</el-button>
        </section>
        <div
            v-if="loading && !data"
            class="operations-panel"
            aria-busy="true"
            aria-label="正在加载运营数据"
        >
            <el-skeleton :rows="8" animated />
        </div>
        <template v-if="data">
            <el-alert
                v-if="data.status === 'partial' || data.status === 'error'"
                :title="
                    data.status === 'error'
                        ? '统计来源暂不可用，请刷新重试'
                        : '部分统计来源暂不可用，已展示其余真实数据'
                "
                type="warning"
                :closable="false"
                show-icon
            />
            <el-alert
                v-if="data.status === 'empty'"
                title="所选期间暂无业务数据，以下零值来自真实统计"
                type="info"
                :closable="false"
            />
            <section class="operations-panel trend-panel">
                <div class="panel-heading">
                    <h2>业务趋势</h2>
                    <span
                        >{{
                            data.range.bucket === 'hour' ? '按小时' : '按日'
                        }}汇总，各图独立单位</span
                    >
                </div>
                <el-tabs v-model="trendKey"
                    ><el-tab-pane
                        v-for="item in trendGroups"
                        :key="item.key"
                        :name="item.key"
                        :label="item.label"
                /></el-tabs>
                <template v-if="currentSeries.length"
                    ><v-charts
                        class="trend-chart"
                        :option="trendOption"
                        autoresize
                        :update-options="{ notMerge: true }"
                        :aria-label="trendDescription"
                    />
                    <p class="chart-summary">
                        {{ trendDescription }}
                    </p></template
                >
                <el-empty
                    v-else
                    :image-size="70"
                    description="该趋势的统计来源暂不可用"
                />
            </section>
            <section class="headline-metrics" aria-label="期间财务核心指标">
                <article
                    v-for="item in metricLayout.highlights"
                    :key="item.key"
                    class="headline-card"
                    :style="metricAccent(item.tone)"
                >
                    <div class="headline-topline">
                        <span class="metric-badge" aria-hidden="true"
                            ><el-icon :size="22"
                                ><component
                                    :is="metricIcons[item.icon]" /></el-icon
                        ></span>
                        <el-tooltip
                            :content="metricHelp(item.metric)"
                            placement="top"
                            ><span
                                class="metric-info"
                                tabindex="0"
                                :aria-label="metricHelp(item.metric)"
                                ><el-icon :size="15"
                                    ><InfoFilled /></el-icon></span
                        ></el-tooltip>
                    </div>
                    <h2 class="headline-label">
                        {{ item.metric?.label || item.label }}
                    </h2>
                    <div class="headline-value">
                        <span
                            v-if="
                                item.key !== 'paid_orders' &&
                                item.metric?.value != null
                            "
                            class="headline-currency"
                            >¥</span
                        >{{ formatHeadlineValue(item.metric?.value, item.key)
                        }}<small>{{ item.metric?.unit || item.unit }}</small>
                    </div>
                    <div
                        class="headline-comparison"
                        :class="`is-${metricComparison(item.metric).state}`"
                    >
                        <span>{{ metricComparison(item.metric).label }}</span>
                        <b v-if="metricComparison(item.metric).value"
                            ><el-icon aria-hidden="true"
                                ><TopRight
                                    v-if="
                                        metricComparison(item.metric).state ===
                                        'up'
                                    " /><BottomRight
                                    v-else-if="
                                        metricComparison(item.metric).state ===
                                        'down'
                                    " /><Minus v-else /></el-icon
                            >{{ metricComparison(item.metric).value }}</b
                        >
                    </div>
                    <p class="headline-previous">
                        {{
                            metricComparison(item.metric).previous ||
                            '所选期间统计'
                        }}
                    </p>
                </article>
            </section>
            <section
                class="operations-panel business-metrics"
                aria-label="期间经营明细"
            >
                <div class="panel-heading">
                    <div>
                        <h2>期间经营明细</h2>
                        <p class="section-description">
                            任务、点数与账户指标分别核对
                        </p>
                    </div>
                    <span
                        >{{ data.range.start_date }} 至
                        {{ data.range.end_date }}</span
                    >
                </div>
                <dl class="detail-metrics-grid">
                    <div
                        v-for="item in detailMetrics"
                        :key="item.metric.key"
                        class="detail-metric"
                        :style="{ '--detail-span': item.span }"
                    >
                        <span class="detail-category">{{ item.category }}</span>
                        <dt>
                            <span>{{ item.metric.label }}</span
                            ><el-tooltip
                                :content="metricHelp(item.metric)"
                                placement="top"
                                ><span
                                    class="metric-info"
                                    tabindex="0"
                                    :aria-label="metricHelp(item.metric)"
                                    ><el-icon :size="13"
                                        ><InfoFilled /></el-icon></span
                            ></el-tooltip>
                        </dt>
                        <dd class="detail-value">
                            {{
                                formatValue(
                                    item.metric.value,
                                    item.metric.unit === '%' ? 2 : 6
                                )
                            }}<small>{{ item.metric.unit }}</small>
                        </dd>
                        <dd class="detail-comparison">
                            <span>{{
                                metricComparison(item.metric).label
                            }}</span
                            ><b v-if="metricComparison(item.metric).value">{{
                                metricComparison(item.metric).value
                            }}</b>
                        </dd>
                    </div>
                </dl>
            </section>
            <section class="operations-panel snapshot-panel">
                <div class="panel-heading">
                    <div>
                        <h2>账户与资源快照</h2>
                        <p class="section-description">
                            当前总量与可用余额，不随日期筛选回溯
                        </p>
                    </div>
                    <span class="snapshot-time"
                        ><el-icon aria-hidden="true"><Clock /></el-icon
                        >更新时快照</span
                    >
                </div>
                <dl class="snapshot-grid">
                    <div
                        v-for="metric in snapshots"
                        :key="metric.key"
                        class="snapshot-item"
                    >
                        <dt>
                            <span>{{ metric.label }}</span
                            ><el-tooltip :content="metricHelp(metric)"
                                ><span
                                    class="metric-info"
                                    tabindex="0"
                                    :aria-label="metricHelp(metric)"
                                    ><el-icon :size="13"
                                        ><InfoFilled /></el-icon></span
                            ></el-tooltip>
                        </dt>
                        <dd>
                            {{ formatValue(metric.value, 6)
                            }}<small>{{ metric.unit }}</small>
                        </dd>
                        <span
                            v-if="metric.status !== 'ready'"
                            class="snapshot-unavailable"
                            >来源暂不可用</span
                        >
                    </div>
                </dl>
            </section>
            <div class="distribution-grid">
                <section
                    v-for="item in distributions"
                    :key="item.key"
                    class="operations-panel"
                >
                    <div class="panel-heading">
                        <h2>{{ item.label }}</h2>
                        <span>{{ item.unit }}</span>
                    </div>
                    <template
                        v-if="
                            item.status === 'ready' &&
                            item.data.some((row) => row.value > 0)
                        "
                        ><v-charts
                            class="pie-chart"
                            :option="pieOption(item)"
                            autoresize
                            :update-options="{ notMerge: true }"
                            :aria-label="
                                chartSummary(item.label, item.data, item.unit)
                            "
                        />
                        <p class="chart-summary">
                            {{ chartSummary(item.label, item.data, item.unit) }}
                        </p></template
                    ><el-empty
                        v-else
                        :image-size="70"
                        :description="
                            item.status === 'ready'
                                ? '所选期间暂无数据'
                                : '统计来源暂不可用'
                        "
                    />
                </section>
            </div>
            <section class="operations-panel">
                <div class="panel-heading">
                    <h2>业务排行</h2>
                    <span>所选期间 · 最多前10项</span>
                </div>
                <el-tabs v-model="rankingKey"
                    ><el-tab-pane
                        v-for="item in rankings"
                        :key="item.key"
                        :name="item.key"
                        :label="item.label" /></el-tabs
                ><el-table
                    :data="currentRanking?.rows || []"
                    :empty-text="
                        currentRanking?.status === 'ready'
                            ? '所选期间暂无排行数据'
                            : '该排行的统计来源暂不可用'
                    "
                    table-layout="auto"
                    ><el-table-column
                        type="index"
                        label="排名"
                        width="70"
                    /><el-table-column
                        prop="name"
                        label="名称"
                        min-width="160"
                        show-overflow-tooltip
                    /><el-table-column
                        :label="`${currentRanking?.key === 'apps_by_points' || currentRanking?.key === 'tenants_by_points' ? '租户已结算点数' : '任务量'}（${currentRanking?.unit || ''}）`"
                        min-width="200"
                        ><template #default="{ row }"
                            ><div class="ranking-value">
                                <el-progress
                                    :percentage="rankPercent(row.value)"
                                    :show-text="false"
                                /><b>{{ formatValue(row.value, 6) }}</b>
                            </div></template
                        ></el-table-column
                    ><el-table-column
                        v-if="currentRanking?.key === 'apps_by_points'"
                        label="用户已结算点数"
                        min-width="150"
                        ><template #default="{ row }">{{
                            formatValue(row.secondary_value, 6)
                        }}</template></el-table-column
                    ></el-table
                >
            </section>
            <section class="operations-panel source-panel">
                <el-collapse
                    ><el-collapse-item name="sources" title="数据来源与统计口径"
                        ><p>
                            不同来源分别汇总，不计算现金利润；任务统计仅涵盖接入统一任务记录的顶层任务。
                        </p>
                        <div
                            v-for="source in data.sources"
                            :key="source.key"
                            class="source-row"
                        >
                            <b
                                >{{ source.label }}
                                <el-tag
                                    size="small"
                                    :type="
                                        source.status === 'ready'
                                            ? 'info'
                                            : 'warning'
                                    "
                                    >{{
                                        source.status === 'ready'
                                            ? '可用'
                                            : '暂不可用'
                                    }}</el-tag
                                ></b
                            >
                            <p>{{ source.note }}</p>
                        </div></el-collapse-item
                    ></el-collapse
                >
            </section>
        </template>
    </div>
</template>

<script setup lang="ts">
import {
    computed,
    onActivated,
    onDeactivated,
    onBeforeUnmount,
    onMounted,
    ref,
    watch
} from 'vue'
import { LineChart, PieChart } from 'echarts/charts'
import {
    AriaComponent,
    GridComponent,
    LegendComponent,
    TooltipComponent
} from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import vCharts from 'vue-echarts'
import {
    Wallet,
    VideoPlay,
    CircleCheck,
    User,
    Coin,
    ShoppingBag,
    DataAnalysis,
    InfoFilled,
    TopRight,
    BottomRight,
    Minus,
    Clock
} from '@element-plus/icons-vue'
import {
    metricComparison,
    formatHeadlineValue,
    detailColumnSpans
} from './metric-presentation'
import type {
    Distribution,
    Metric,
    OperationsData,
    OperationsParams,
    Ranking
} from './model'
import { chartSummary, trendGroups, organizeMetrics } from './model'
import type { MetricTone } from './model'
import { createRequestScope, formatValue, validateDateRange } from './request'

use([
    CanvasRenderer,
    LineChart,
    PieChart,
    AriaComponent,
    GridComponent,
    LegendComponent,
    TooltipComponent
])

const props = defineProps<{
    scope: 'platform' | 'tenant'
    loader: (params: OperationsParams) => Promise<OperationsData>
    identity: string
    getIdentity: () => string
    theme: {
        primary: string
        success: string
        warning: string
        danger: string
        info: string
    }
    dark: boolean
}>()
const data = ref<OperationsData | null>(null),
    loading = ref(false),
    error = ref('')
const range = ref('7d'),
    dates = ref<string[] | null>(null),
    dateError = ref(''),
    trendKey = ref('cash'),
    rankingKey = ref('apps_by_tasks')
const ranges = [
    { value: 'today', label: '今天' },
    { value: 'yesterday', label: '昨天' },
    { value: '7d', label: '近7天' },
    { value: '30d', label: '近30天' },
    { value: 'custom', label: '自定义' }
]
const requests = createRequestScope(props.getIdentity)
let alive = true
let wasDeactivated = false
const updatedText = computed(() =>
    data.value
        ? new Date(data.value.updated_at * 1000).toLocaleString('zh-CN', {
              timeZone: 'Asia/Shanghai',
              hour12: false
          })
        : '—'
)
const rangeText = computed(() =>
    data.value
        ? `${data.value.range.start_date} 至 ${data.value.range.end_date}`
        : '选择日期后加载统计'
)
const metricLayout = computed(() =>
    organizeMetrics(data.value?.metrics || [], props.scope)
)
const detailMetrics = computed(() => {
    const items = metricLayout.value.groups.flatMap((group) =>
        group.metrics.map((metric) => ({ metric, category: group.label }))
    )
    const spans = detailColumnSpans(items.length)
    return items.map((item, index) => ({ ...item, span: spans[index] }))
})
const metricIcons = {
    wallet: Wallet,
    task: VideoPlay,
    success: CircleCheck,
    account: User,
    points: Coin,
    trade: ShoppingBag,
    activity: DataAnalysis
}
const metricAccent = (tone: MetricTone) => ({
    '--metric-accent': props.theme[tone]
})
const snapshots = computed(() => metricLayout.value.snapshots)
const palette = computed(() => [
    props.theme.primary,
    props.theme.success,
    props.theme.warning,
    props.theme.danger,
    props.theme.info
])
const reducedMotion = ref(
    typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
)
let motion: MediaQueryList | undefined
const motionChanged = (event: MediaQueryListEvent) => {
    reducedMotion.value = event.matches
}
const chartTokens = ref({ text: '#606266', border: '#e5e7eb' })
function readChartTokens() {
    const styles = window.getComputedStyle(document.documentElement)
    chartTokens.value = {
        text:
            styles.getPropertyValue('--el-text-color-regular').trim() ||
            (props.dark ? '#d6d8df' : '#606266'),
        border:
            styles.getPropertyValue('--el-border-color-light').trim() ||
            (props.dark ? '#3f424c' : '#e5e7eb')
    }
}
watch(() => [props.dark, props.theme], readChartTokens, {
    deep: true,
    flush: 'post'
})
const textColor = computed(() => chartTokens.value.text),
    axisColor = computed(() => chartTokens.value.border)
const currentSeries = computed(() => {
    const keys =
        trendGroups.find((item) => item.key === trendKey.value)?.keys || []
    return (
        data.value?.trend.series.filter((item) => keys.includes(item.key)) || []
    )
})
const trendDescription = computed(() =>
    currentSeries.value
        .map(
            (item) =>
                `${item.label}：${item.data.filter((value) => value !== null).length}个${data.value?.range.bucket === 'hour' ? '小时' : '日期'}观测值，期间合计${formatValue(
                    item.data.some((value) => value !== null)
                        ? item.data.reduce<number>(
                              (sum, value) => sum + (value ?? 0),
                              0
                          )
                        : null,
                    6
                )}${item.unit}`
        )
        .join('；')
)
const chartBase = computed(() => ({
    color: palette.value,
    animation: !reducedMotion.value,
    animationDuration: 500,
    animationDurationUpdate: 500,
    aria: { enabled: true },
    textStyle: { color: textColor.value },
    legend: { type: 'scroll', textStyle: { color: textColor.value } },
    tooltip: { confine: true }
}))
const taskColor = (key: string) => {
    if (key === 'success') return props.theme.success
    if (key === 'failed') return props.theme.danger
    if (['canceled', 'cancelled', 'cancel'].includes(key))
        return props.theme.info
    if (key === 'total') return props.theme.primary
    return props.theme.warning
}
const trendOption = computed(() => ({
    ...chartBase.value,
    tooltip: { trigger: 'axis', confine: true },
    grid: { left: 20, right: 28, top: 52, bottom: 20, containLabel: true },
    legend: { ...chartBase.value.legend, top: 2 },
    xAxis: {
        type: 'category',
        boundaryGap: false,
        data: data.value?.trend.labels || [],
        axisLabel: { color: textColor.value },
        axisLine: { lineStyle: { color: axisColor.value } }
    },
    yAxis: {
        type: 'value',
        name: currentSeries.value[0]?.unit || '',
        axisLabel: { color: textColor.value },
        splitLine: { lineStyle: { color: axisColor.value } }
    },
    series: currentSeries.value.map((item) => ({
        name: item.label,
        type: 'line',
        smooth: false,
        showSymbol: false,
        connectNulls: false,
        lineStyle: {
            width: 2,
            ...(item.key.startsWith('task_')
                ? { color: taskColor(item.key.slice(5)) }
                : {})
        },
        ...(item.key.startsWith('task_')
            ? { itemStyle: { color: taskColor(item.key.slice(5)) } }
            : {}),
        data: item.data
    }))
}))
const distributionDefs = computed(() => [
    { key: 'task_status', label: '任务状态分布', unit: '个', source: 'tasks' },
    { key: 'cash_sources', label: '收款来源', unit: '元', source: 'payments' },
    ...(props.scope === 'tenant'
        ? [
              {
                  key: 'point_issuance',
                  label: '点数发放来源',
                  unit: '点',
                  source: 'user_points'
              }
          ]
        : [])
])
const distributions = computed<Distribution[]>(() =>
    distributionDefs.value.map(
        (def) =>
            data.value?.distributions.find((item) => item.key === def.key) || {
                ...def,
                status: 'unavailable',
                data: []
            }
    )
)
const pieOption = (item: Distribution) => ({
    ...chartBase.value,
    tooltip: {
        trigger: 'item',
        confine: true,
        valueFormatter: (value: number) =>
            `${formatValue(value, 6)} ${item.unit}`
    },
    legend: { ...chartBase.value.legend, bottom: 0 },
    series: [
        {
            type: 'pie',
            radius: ['47%', '68%'],
            center: ['50%', '43%'],
            avoidLabelOverlap: true,
            label: { show: false },
            emphasis: { label: { show: false }, scale: !reducedMotion.value },
            data: item.data.map((row) => ({
                name: row.name,
                value: row.value,
                ...(item.key === 'task_status'
                    ? { itemStyle: { color: taskColor(row.key) } }
                    : {})
            }))
        }
    ]
})
const rankingDefs = computed(() => [
    { key: 'apps_by_tasks', label: '应用任务排行', unit: '个' },
    { key: 'apps_by_points', label: '应用结算点数排行', unit: '点' },
    props.scope === 'tenant'
        ? { key: 'users_by_tasks', label: '用户任务排行', unit: '个' }
        : { key: 'tenants_by_points', label: '租户结算点数排行', unit: '点' }
])
const rankings = computed<Ranking[]>(() =>
    rankingDefs.value.map(
        (def) =>
            data.value?.rankings.find((item) => item.key === def.key) || {
                ...def,
                status: 'unavailable',
                rows: []
            }
    )
)
const currentRanking = computed(() =>
    rankings.value.find((item) => item.key === rankingKey.value)
)
const rankPercent = (value: number) =>
    Math.max(
        0,
        Math.min(
            100,
            (Number(value) /
                Math.max(
                    ...(currentRanking.value?.rows.map((row) =>
                        Number(row.value)
                    ) || []),
                    1
                )) *
                100
        )
    )
function metricHelp(metric?: Metric) {
    if (!metric) return '该统计来源尚未返回数据，请刷新后重试。'
    const source = data.value?.sources.find(
        (item) => item.key === metric.source
    )
    return `${metric.note}。${source?.label || ''}：${source?.note || ''}`
}
function futureDate(date: Date) {
    const today = new Date().toLocaleDateString('en-CA', {
        timeZone: 'Asia/Shanghai'
    })
    return (
        date.getFullYear() +
            '-' +
            String(date.getMonth() + 1).padStart(2, '0') +
            '-' +
            String(date.getDate()).padStart(2, '0') >
        today
    )
}
async function refresh() {
    if (!alive || !props.getIdentity()) return
    if (range.value === 'custom') {
        dateError.value = validateDateRange(dates.value)
        if (
            !dateError.value &&
            dates.value &&
            futureDate(new Date(`${dates.value[1]}T00:00:00`))
        )
            dateError.value = '结束日期不能晚于今天'
        if (dateError.value) return
    }
    const current = requests.begin()
    loading.value = true
    error.value = ''
    data.value = null
    const params: OperationsParams = { range: range.value }
    if (range.value === 'custom' && dates.value) {
        params.start_date = dates.value[0]
        params.end_date = dates.value[1]
    }
    try {
        const result = await props.loader(params)
        if (!alive || !current()) return
        if (
            result.schema_version !== 1 ||
            result.scope !== props.scope ||
            !Array.isArray(result.metrics) ||
            !Array.isArray(result.sources) ||
            !Array.isArray(result.rankings) ||
            !Array.isArray(result.trend?.series) ||
            !result.range
        )
            throw Error('统计数据格式或账户范围不匹配')
        data.value = result
        if (
            !result.rankings.some(
                (item: Ranking) => item.key === rankingKey.value
            )
        )
            rankingKey.value = result.rankings[0]?.key || 'apps_by_tasks'
    } catch {
        if (alive && current())
            error.value =
                '请检查网络后重试。若持续失败，请联系管理员检查统计接口。'
    } finally {
        if (alive && current()) loading.value = false
    }
}
function changeRange() {
    dateError.value = ''
    requests.invalidate()
    data.value = null
    error.value = ''
    loading.value = false
    if (range.value !== 'custom') void refresh()
}
function applyDates() {
    void refresh()
}
watch(
    () => props.identity,
    () => {
        requests.invalidate()
        data.value = null
        error.value = ''
        loading.value = false
        if (props.identity) {
            void refresh()
        }
    },
    { flush: 'sync' }
)
onMounted(() => {
    readChartTokens()
    motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    motion.addEventListener?.('change', motionChanged)
    void refresh()
})
onDeactivated(() => {
    alive = false
    wasDeactivated = true
    requests.invalidate()
    loading.value = false
})
onActivated(() => {
    if (!wasDeactivated) return
    alive = true
    wasDeactivated = false
    void refresh()
})
onBeforeUnmount(() => {
    alive = false
    requests.invalidate()
    motion?.removeEventListener?.('change', motionChanged)
})
</script>

<style scoped>
.operations-dashboard {
    display: grid;
    gap: 20px;
    min-width: 0;
    color: var(--el-text-color-primary);
}
.operations-header,
.panel-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
}
.operations-header h1 {
    font-size: 22px;
    font-weight: 600;
    margin: 0;
}
.operations-header p {
    margin: 8px 0 0;
    color: var(--el-text-color-regular);
    font-size: 13px;
}
.refresh-area {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    font-size: 12px;
    color: var(--el-text-color-regular);
}
.operations-panel {
    min-width: 0;
    padding: 24px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-light);
    border-radius: 10px;
}
.operations-panel h2 {
    font-size: 15px;
    font-weight: 600;
    margin: 0;
}
.panel-heading {
    margin-bottom: 20px;
}
.panel-heading > span,
.scope-note,
.metric-note,
.chart-summary {
    font-size: 12px;
    color: var(--el-text-color-regular);
    line-height: 1.6;
}
.scope-note {
    margin: 14px 0 0;
}
.filters {
    display: flex;
    flex-wrap: wrap;
    gap: 12px 20px;
    align-items: center;
}
.filters .scope-note,
.filters .error-text {
    width: 100%;
    margin: 0;
}
.range-buttons {
    max-width: 100%;
    overflow: auto;
}
.custom-range {
    display: flex;
    gap: 8px;
    min-width: 0;
    flex-wrap: wrap;
}
.custom-range :deep(.el-date-editor) {
    width: 300px;
    max-width: 100%;
}
.headline-metrics {
    display: grid;
    grid-auto-rows: 1fr;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
}
.headline-card {
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: 22px 24px 18px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-light);
    border-radius: 10px;
    animation: metric-enter 360ms ease-out both;
}
.headline-card:first-child {
    border-color: color-mix(
        in srgb,
        var(--metric-accent) 40%,
        var(--el-border-color-light)
    );
}
.headline-card:first-child .headline-value {
    color: color-mix(
        in srgb,
        var(--metric-accent) 55%,
        var(--el-text-color-primary)
    );
}
.headline-currency {
    font-size: 18px;
    font-weight: 500;
    letter-spacing: 0;
}
.headline-card:nth-child(2) {
    animation-delay: 30ms;
}
.headline-card:nth-child(3) {
    animation-delay: 60ms;
}
.headline-card:nth-child(4) {
    animation-delay: 90ms;
}
.headline-topline {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18px;
}
.metric-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    flex-shrink: 0;
    background: var(--el-fill-color-light);
    background: color-mix(
        in srgb,
        var(--metric-accent) 12%,
        var(--el-bg-color)
    );
    color: var(--metric-accent);
    color: color-mix(
        in srgb,
        var(--metric-accent) 75%,
        var(--el-text-color-primary)
    );
}
.metric-badge.is-small {
    width: 34px;
    height: 34px;
    border-radius: 8px;
}
.headline-label {
    font-size: 13px;
    font-weight: 400;
    color: var(--el-text-color-regular);
    line-height: 1.5;
    margin: 0;
}
.headline-value {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
    margin-bottom: 18px;
    min-height: 43px;
    font-size: clamp(27px, 2.6vw, 34px);
    font-weight: 600;
    letter-spacing: -0.6px;
    line-height: 1.25;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
}
.headline-value small,
.detail-value small,
.snapshot-item small {
    font-size: 12px;
    font-weight: 400;
    color: var(--el-text-color-regular);
    letter-spacing: 0;
}
.headline-comparison {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 6px 10px;
    margin-top: auto;
    padding-top: 14px;
    border-top: 1px solid var(--el-border-color-lighter);
    font-size: 12px;
    line-height: 1.5;
    color: var(--el-text-color-regular);
}
.headline-comparison b {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 12px;
    font-weight: 500;
    color: var(--el-text-color-primary);
    font-variant-numeric: tabular-nums;
}
.headline-previous {
    margin: 5px 0 0;
    font-size: 12px;
    color: var(--el-text-color-regular);
    line-height: 1.5;
    overflow-wrap: anywhere;
}
.section-description {
    margin: 5px 0 0;
    font-size: 12px;
    line-height: 1.6;
    color: var(--el-text-color-regular);
}
.detail-metrics-grid {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    grid-auto-rows: 1fr;
    gap: 12px;
    margin: 0;
}
.detail-metric {
    grid-column: span var(--detail-span);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 7px;
    min-width: 0;
    min-height: 148px;
    padding: 16px 18px;
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 7px;
}
.detail-category {
    font-size: 11px;
    line-height: 1.5;
    color: var(--el-text-color-regular);
}
.detail-metric dt,
.snapshot-item dt {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-size: 12px;
    line-height: 1.6;
    color: var(--el-text-color-regular);
}
.detail-metric dt > span:first-child {
    overflow-wrap: anywhere;
}
.detail-value {
    margin: 2px 0 0;
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 5px;
    min-width: 0;
    font-size: 23px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    line-height: 1.35;
    overflow-wrap: anywhere;
}
.detail-comparison {
    margin: auto 0 0;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 6px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--el-text-color-regular);
}
.detail-comparison b {
    font-weight: 500;
    color: var(--el-text-color-primary);
}
.metric-info {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    color: var(--el-text-color-regular);
    cursor: help;
    border-radius: 3px;
}
.metric-info:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 3px;
}
.snapshot-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin: 0;
}
.snapshot-item {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: 9px;
    min-width: 0;
    padding: 16px 18px;
    background: var(--el-fill-color-light);
    border-radius: 7px;
}
.snapshot-item dd {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 6px;
    margin: 0;
    font-size: 21px;
    line-height: 1.4;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
}
.snapshot-time {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    white-space: nowrap;
}
.snapshot-unavailable {
    font-size: 12px;
    line-height: 1.5;
    color: var(--el-text-color-regular);
}
@keyframes metric-enter {
    from {
        opacity: 0;
        transform: translateY(4px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
.trend-chart {
    height: 320px;
    width: 100%;
}
.distribution-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
    gap: 20px;
    min-width: 0;
}
.pie-chart {
    height: 260px;
    width: 100%;
}
.chart-summary {
    margin: 8px 0 0;
}
.ranking-value {
    display: flex;
    align-items: center;
    gap: 14px;
}
.ranking-value :deep(.el-progress) {
    width: 140px;
    max-width: 45%;
}
.ranking-value b {
    font-weight: 500;
    font-variant-numeric: tabular-nums;
}
.error-text {
    color: var(--el-color-danger);
    font-size: 13px;
}
.failure p {
    color: var(--el-text-color-regular);
    margin: 14px 0;
}
.source-panel {
    padding-top: 10px;
    padding-bottom: 10px;
}
.source-panel :deep(.el-collapse) {
    border: none;
}
.source-row {
    padding: 12px 0;
    border-top: 1px solid var(--el-border-color-lighter);
}
.source-row b {
    font-weight: 500;
}
.source-row p {
    margin: 6px 0 0;
    color: var(--el-text-color-regular);
}
@media (max-width: 1200px) {
    .detail-metric {
        grid-column: auto;
    }
    .detail-metric:last-child:nth-child(odd) {
        grid-column: 1 / -1;
    }
    .headline-metrics,
    .detail-metrics-grid,
    .snapshot-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}
@media (max-width: 850px) {
    .headline-card {
        padding: 20px;
    }
    .operations-header {
        align-items: flex-start;
        flex-direction: column;
    }
    .operations-panel {
        padding: 20px;
    }
    .panel-heading {
        align-items: flex-start;
        flex-wrap: wrap;
    }
}
@media (max-width: 480px) {
    .headline-metrics,
    .detail-metrics-grid,
    .snapshot-grid {
        grid-template-columns: 1fr;
    }
    .operations-panel {
        padding: 16px;
    }
    .operations-header h1 {
        font-size: 20px;
    }
    .refresh-area {
        gap: 8px;
    }
    .trend-chart {
        height: 280px;
    }
    .custom-range {
        width: 100%;
    }
    .custom-range :deep(.el-date-editor) {
        width: 100%;
        min-width: 0;
    }
    .chart-summary {
        overflow-wrap: anywhere;
    }
}
@media (prefers-reduced-motion: reduce) {
    .operations-dashboard :deep(*),
    .operations-dashboard :deep(*::before),
    .operations-dashboard :deep(*::after) {
        animation: none !important;
        transition: none !important;
    }
}
</style>
