const { test } = require('node:test')
const assert = require('node:assert/strict'),
    fs = require('node:fs'),
    vm = require('node:vm'),
    path = require('node:path')
const ts = require('../../../tenant/node_modules/typescript')
function load(file) {
    const exports = {}
    vm.runInNewContext(
        ts.transpileModule(
            fs.readFileSync(path.join(__dirname, '..', file), 'utf8'),
            {
                compilerOptions: {
                    module: ts.ModuleKind.CommonJS,
                    target: ts.ScriptTarget.ES2022
                }
            }
        ).outputText,
        {
            exports,
            Date,
            require(name) {
                if (name === './request') return load('request.ts')
                throw Error(name)
            }
        }
    )
    return exports
}
const { createRequestScope, validateDateRange, formatValue } =
    load('request.ts')
test('latest filter response owns the view; tenant/session changes and unmount invalidate responses', () => {
    let identity = 'tenant-a:operator-a'
    const scope = createRequestScope(() => identity),
        first = scope.begin(),
        second = scope.begin()
    assert.equal(first(), false)
    assert.equal(second(), true)
    identity = 'tenant-b:operator-a'
    assert.equal(second(), false)
    const third = scope.begin()
    identity = 'tenant-b:operator-b'
    assert.equal(third(), false)
    const fourth = scope.begin()
    scope.invalidate()
    assert.equal(fourth(), false)
})
test('custom dates require an ordered inclusive range up to 90 days', () => {
    assert.equal(validateDateRange(['2026-01-01', '2026-03-31']), '')
    assert.match(validateDateRange(['2026-01-01', '2026-04-01']), /90/)
    assert.match(validateDateRange(['2026-03-31', '2026-01-01']), /早于/)
    assert.match(validateDateRange(null), /完整/)
    assert.match(validateDateRange(['2026-02-30', '2026-03-01']), /有效/)
    assert.equal(validateDateRange(['2024-02-29', '2024-02-29']), '')
})
test('missing source value stays missing and true zero is rendered', () => {
    assert.equal(formatValue(null), '—')
    assert.equal(formatValue(undefined), '—')
    assert.equal(formatValue(0), '0')
    assert.equal(formatValue('n/a'), '—')
    assert.equal(formatValue('12.34', 2), '12.34')
})
const vue = require('../../../tenant/node_modules/vue'),
    {
        parse,
        compileScript,
        compileTemplate
    } = require('../../../tenant/node_modules/vue/compiler-sfc')
function fixture(loader) {
    const filename = path.join(__dirname, '../OperationsDashboard.vue'),
        descriptor = parse(fs.readFileSync(filename, 'utf8')).descriptor,
        exports = {},
        unmount = [],
        activate = [],
        deactivate = []
    assert.deepEqual(
        compileTemplate({
            source: descriptor.template.content,
            filename,
            id: 'operations',
            isTS: true
        }).errors,
        []
    )
    vm.runInNewContext(
        ts.transpileModule(
            compileScript(descriptor, { id: 'operations' }).content,
            {
                compilerOptions: {
                    module: ts.ModuleKind.CommonJS,
                    target: ts.ScriptTarget.ES2022,
                    esModuleInterop: true
                }
            }
        ).outputText,
        {
            exports,
            Date,
            document: { documentElement: {} },
            window: {
                matchMedia: () => ({ matches: true }),
                getComputedStyle: () => ({ getPropertyValue: () => '#456' })
            },
            require(name) {
                if (name === 'vue')
                    return {
                        ...vue,
                        onMounted() {},
                        onActivated(fn) {
                            activate.push(fn)
                        },
                        onDeactivated(fn) {
                            deactivate.push(fn)
                        },
                        onBeforeUnmount(fn) {
                            unmount.push(fn)
                        }
                    }
                if (name === 'vue-echarts') return {}
                if (name === 'echarts/core') return { use() {} }
                if (name === 'echarts/charts')
                    return { LineChart: {}, PieChart: {} }
                if (name === 'echarts/components')
                    return {
                        AriaComponent: {},
                        GridComponent: {},
                        LegendComponent: {},
                        TooltipComponent: {}
                    }
                if (name === 'echarts/renderers')
                    return { CanvasRenderer: {} }
                if (name === '@element-plus/icons-vue')
                    return require('../../../tenant/node_modules/@element-plus/icons-vue')
                if (name === './metric-presentation')
                    return load('metric-presentation.ts')
                if (name === './request') return load('request.ts')
                if (name === './model') return load('model.ts')
                throw Error(name)
            }
        }
    )
    const props = vue.reactive({
            scope: 'tenant',
            loader,
            identity: 'tenant-a:operator-a',
            getIdentity: () => props.identity,
            theme: {
                primary: '#123',
                success: '#234',
                warning: '#345',
                danger: '#456',
                info: '#567'
            },
            dark: false
        }),
        scope = vue.effectScope(),
        state = scope.run(() => exports.default.setup(props, { expose() {} }))
    return {
        state,
        props,
        deactivate() {
            deactivate.forEach((fn) => fn())
        },
        activate() {
            activate.forEach((fn) => fn())
        },
        close() {
            unmount.forEach((fn) => fn())
            scope.stop()
        }
    }
}
const result = (patch = {}) => ({
    schema_version: 1,
    scope: 'tenant',
    updated_at: 1000,
    status: 'ready',
    range: { start_date: '2026-01-01', end_date: '2026-01-07', bucket: 'day' },
    metrics: [],
    sources: [],
    distributions: [],
    rankings: [],
    trend: { labels: ['01-01'], series: [] },
    warnings: [],
    ...patch
})
test('real dashboard rejects late filter responses and can retry a request failure', async () => {
    const pending = []
    const f = fixture(
        () =>
            new Promise((resolve, reject) => pending.push({ resolve, reject }))
    )
    const first = f.state.refresh()
    f.state.range.value = '30d'
    const second = f.state.refresh()
    pending[1].resolve(result({ updated_at: 2000 }))
    await second
    pending[0].resolve(result({ updated_at: 1000 }))
    await first
    assert.equal(f.state.data.value.updated_at, 2000)
    assert.equal(f.state.loading.value, false)
    const failed = f.state.refresh()
    pending[2].reject(Error('network'))
    await failed
    assert.match(f.state.error.value, /重试/)
    assert.equal(f.state.data.value, null)
    const retried = f.state.refresh()
    pending[3].resolve(result())
    await retried
    assert.equal(f.state.error.value, '')
    assert.equal(f.state.data.value.updated_at, 1000)
    f.close()
})
test('operator logout clears real data and discards an outstanding response', async () => {
    let resolve
    const f = fixture(() => new Promise((done) => (resolve = done)))
    const request = f.state.refresh()
    f.props.identity = ''
    resolve(result())
    await request
    assert.equal(f.state.data.value, null)
    assert.equal(f.state.loading.value, false)
    f.close()
})
test('invalid custom range does not send; valid statistics failure is retryable', async () => {
    let calls = 0
    const f = fixture(async () => {
        calls++
        throw Error('network')
    })
    f.state.range.value = 'custom'
    f.state.dates.value = ['2026-01-01', '2026-04-01']
    await f.state.refresh()
    assert.equal(calls, 0)
    assert.match(f.state.dateError.value, /90/)
    f.state.range.value = '7d'
    await f.state.refresh()
    assert.equal(calls, 1)
    assert.match(f.state.error.value, /重试/)
    f.close()
})
test('real chart options keep units independent, missing sources explicit and motion finite', async () => {
    const metrics = [
        {
            key: 'user_total',
            label: '用户',
            value: 12,
            unit: '人',
            status: 'ready'
        },
        {
            key: 'cash_received',
            label: '收款',
            value: null,
            unit: '元',
            status: 'unavailable'
        },
        {
            key: 'task_success_rate',
            label: '成功率',
            value: null,
            unit: '%',
            status: 'ready'
        }
    ]
    const f = fixture(async () =>
        result({
            status: 'partial',
            metrics,
            trend: {
                labels: ['01-01'],
                series: [
                    { key: 'task_total', label: '任务', unit: '个', data: [0] },
                    {
                        key: 'cash_received',
                        label: '收款',
                        unit: '元',
                        data: [10]
                    },
                    {
                        key: 'settled_tenant_points',
                        label: '结算',
                        unit: '点',
                        data: [20]
                    }
                ]
            }
        })
    )
    await f.state.refresh()
    assert.equal(f.state.snapshots.value.length, 1)
    assert.equal(
        f.state.metricLayout.value.highlights.filter((item) => item.metric)
            .length,
        1
    )
    assert.equal(f.state.trendKey.value, 'cash')
    assert.deepEqual(
        [...load('model.ts').trendGroups.map((item) => item.key)],
        ['cash', 'tasks', 'points', 'growth']
    )
    assert.equal(f.state.trendOption.value.yAxis.name, '元')
    f.state.trendKey.value = 'tasks'
    assert.equal(f.state.trendOption.value.yAxis.name, '个')
    assert.equal(f.state.trendOption.value.series.length, 1)
    assert.equal(f.state.trendOption.value.animation, false)
    f.state.reducedMotion.value = false
    assert.equal(f.state.trendOption.value.animationDuration, 500)
    f.state.trendKey.value = 'cash'
    assert.equal(f.state.trendOption.value.yAxis.name, '元')
    assert.equal(f.state.trendOption.value.series[0].name, '收款')
    f.state.trendKey.value = 'points'
    assert.equal(f.state.trendOption.value.yAxis.name, '点')
    assert.equal(f.state.distributions.value[0].status, 'unavailable')
    assert.equal(f.state.currentRanking.value.status, 'unavailable')
    f.close()
})
test('unmounted page and mismatched response scope cannot populate a dashboard', async () => {
    let resolve
    const f = fixture(() => new Promise((done) => (resolve = done)))
    const request = f.state.refresh()
    f.close()
    resolve(result())
    await request
    assert.equal(f.state.data.value, null)
    const wrong = fixture(async () => result({ scope: 'platform' }))
    await wrong.state.refresh()
    assert.equal(wrong.state.data.value, null)
    assert.match(wrong.state.error.value, /重试/)
    wrong.close()
})

test('keep-alive suspends pending writes and reactivation refreshes from the real loader', async () => {
    const pending = []
    const f = fixture(() => new Promise((resolve) => pending.push(resolve)))
    const request = f.state.refresh()
    f.deactivate()
    pending[0](result())
    await request
    assert.equal(f.state.data.value, null)
    f.activate()
    assert.equal(pending.length, 2)
    pending[1](result({ updated_at: 3000 }))
    await new Promise((resolve) => setImmediate(resolve))
    assert.equal(f.state.data.value.updated_at, 3000)
    f.close()
})
test('all-null chart data is unavailable, not a fabricated total of zero', async () => {
    const f = fixture(async () =>
        result({
            trend: {
                labels: ['01-01'],
                series: [
                    {
                        key: 'task_total',
                        label: '任务',
                        unit: '个',
                        data: [null]
                    }
                ]
            }
        })
    )
    await f.state.refresh()
    f.state.trendKey.value = 'tasks'
    assert.match(f.state.trendDescription.value, /期间合计—/)
    f.close()
})
test('shared script, contract and request helpers pass strict TypeScript semantic checks', () => {
    const directory = path.resolve(__dirname, '..')
    const virtualFile = path.join(directory, '__operations_typecheck__.ts')
    const source = compileScript(
        parse(
            fs.readFileSync(
                path.join(directory, 'OperationsDashboard.vue'),
                'utf8'
            )
        ).descriptor,
        { id: 'typecheck' }
    ).content
    const options = {
        noEmit: true,
        skipLibCheck: true,
        strict: true,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
        allowSyntheticDefaultImports: true
    }
    const host = ts.createCompilerHost(options),
        read = host.readFile,
        exists = host.fileExists
    host.readFile = (file) => (file === virtualFile ? source : read(file))
    host.fileExists = (file) => file === virtualFile || exists(file)
    const diagnostics = ts
        .getPreEmitDiagnostics(ts.createProgram([virtualFile], options, host))
        .filter((item) => item.file?.fileName.startsWith(directory))
    assert.deepEqual(
        diagnostics.map((item) =>
            ts.flattenDiagnosticMessageText(item.messageText, ' ')
        ),
        []
    )
})

test('task line and pie colors follow status semantics independent of row order; money and points retain the palette', async () => {
    const f = fixture(async () =>
        result({
            trend: {
                labels: ['01-01'],
                series: [
                    {
                        key: 'task_failed',
                        label: '失败',
                        unit: '个',
                        data: [1]
                    },
                    {
                        key: 'task_running',
                        label: '进行中',
                        unit: '个',
                        data: [2]
                    },
                    {
                        key: 'task_success',
                        label: '成功',
                        unit: '个',
                        data: [3]
                    },
                    {
                        key: 'cash_received',
                        label: '收款',
                        unit: '元',
                        data: [4]
                    },
                    {
                        key: 'settled_tenant_points',
                        label: '点数',
                        unit: '点',
                        data: [5]
                    }
                ]
            }
        })
    )
    await f.state.refresh()
    f.state.trendKey.value = 'tasks'
    const colors = f.state.trendOption.value.series.map(
        (item) => item.lineStyle.color
    )
    assert.deepEqual(
        [...colors],
        [f.props.theme.danger, f.props.theme.warning, f.props.theme.success]
    )
    const states = [
        'failed',
        'success',
        'pending',
        'running',
        'partial_success',
        'canceled',
        'cancelled'
    ]
    const pie = f.state.pieOption({
        key: 'task_status',
        label: '任务状态',
        unit: '个',
        status: 'ready',
        data: states.map((key) => ({ key, name: key, value: 1 }))
    })
    assert.deepEqual(
        [...pie.series[0].data.map((row) => row.itemStyle.color)],
        [
            f.props.theme.danger,
            f.props.theme.success,
            f.props.theme.warning,
            f.props.theme.warning,
            f.props.theme.warning,
            f.props.theme.info,
            f.props.theme.info
        ]
    )
    for (const key of ['cash', 'points']) {
        f.state.trendKey.value = key
        assert.equal(
            f.state.trendOption.value.series[0].lineStyle.color,
            undefined
        )
        assert.equal(f.state.trendOption.value.series[0].itemStyle, undefined)
    }
    const cash = f.state.pieOption({
        key: 'cash_sources',
        label: '收款来源',
        unit: '元',
        status: 'ready',
        data: [{ key: 'success', name: '收款', value: 1 }]
    })
    assert.equal(cash.series[0].data[0].itemStyle, undefined)
    f.close()
})

test('metric hierarchy preserves each true metric once, keeps snapshots separate and retains future metrics', () => {
    const { organizeMetrics, snapshotKeys } = load('model.ts')
    const keys = [
        'cash_received',
        'order_average',
        'task_total',
        'task_success_rate',
        'user_new',
        'settled_tenant_points',
        'settled_user_points',
        'points_issued',
        'points_consumed',
        'points_returned',
        'paid_orders',
        'refund_amount',
        'app_openings',
        'task_success',
        'task_failed',
        'task_running',
        'active_users',
        'future_real_metric',
        ...snapshotKeys
    ]
    const metrics = keys.map((key) => ({
        key,
        value: key === 'task_success_rate' ? null : 0,
        status: 'ready'
    }))
    const sections = organizeMetrics(metrics, 'tenant')
    assert.deepEqual(
        [...sections.highlights.map((item) => item.key)],
        ['cash_received', 'refund_amount', 'paid_orders', 'order_average']
    )
    const displayed = [
        ...sections.highlights.map((item) => item.metric),
        ...sections.groups.flatMap((group) => group.metrics),
        ...sections.snapshots
    ]
    assert.deepEqual(displayed.map((item) => item.key).sort(), [...keys].sort())
    assert.equal(
        sections.groups.find((item) => item.key === 'other').metrics[0].key,
        'future_real_metric'
    )
    assert.equal(
        sections.groups
            .flatMap((group) => group.metrics)
            .find((metric) => metric.key === 'task_success_rate').value,
        null
    )
    assert.equal(
        organizeMetrics([], 'platform').highlights[3].key,
        'order_average'
    )
    assert.equal(
        organizeMetrics([], 'platform').highlights[0].metric,
        undefined
    )
})
test('comparison presentation preserves relative rate changes, source failure, missing denominator and true zero', () => {
    const { metricComparison } = load('metric-presentation.ts')
    const metric = {
        value: 0,
        previous: 0,
        change_percent: null,
        status: 'ready',
        unit: '元'
    }
    assert.match(metricComparison(metric).label, /上期为0/)
    assert.match(
        metricComparison({ ...metric, value: null }).label,
        /暂无可计算/
    )
    assert.match(
        metricComparison({ ...metric, status: 'unavailable' }).label,
        /来源/
    )
    assert.equal(
        metricComparison({
            ...metric,
            value: 80,
            previous: 50,
            change_percent: 60,
            unit: '%'
        }).label,
        '相对上期变化'
    )
    assert.equal(
        metricComparison({
            ...metric,
            value: 80,
            previous: 50,
            change_percent: 60,
            unit: '%'
        }).value,
        '+60%'
    )
    assert.equal(
        metricComparison({
            ...metric,
            value: 80,
            previous: 100,
            change_percent: -20
        }).state,
        'down'
    )
    assert.equal(
        metricComparison({
            ...metric,
            value: 80,
            previous: 80,
            change_percent: 0
        }).value,
        '0%'
    )
})

test('financial cards keep two decimals and average order value only uses the server metric', () => {
    const { formatHeadlineValue, metricComparison } = load(
        'metric-presentation.ts'
    )
    assert.equal(formatHeadlineValue(0, 'cash_received'), '0.00')
    assert.equal(formatHeadlineValue(1289.5, 'refund_amount'), '1,289.50')
    assert.equal(formatHeadlineValue(12.345, 'order_average'), '12.35')
    assert.equal(formatHeadlineValue(7, 'paid_orders'), '7')
    assert.equal(formatHeadlineValue(null, 'order_average'), '—')
    assert.equal(
        metricComparison({ key: 'order_average', value: null, status: 'ready' })
            .label,
        '无付费订单'
    )
    const { organizeMetrics } = load('model.ts')
    assert.equal(
        organizeMetrics(
            [
                { key: 'cash_received', value: 100 },
                { key: 'paid_orders', value: 2 }
            ],
            'tenant'
        ).highlights[3].metric,
        undefined
    )
})

test('detail metrics fill complete desktop rows without orphan cards or placeholders', () => {
    const { detailColumnSpans } = load('metric-presentation.ts')
    const rowCounts = (count) => {
        const spans = detailColumnSpans(count),
            rows = []
        assert.equal(spans.length, count)
        let width = 0,
            items = 0
        for (const span of spans) {
            assert.ok([3, 4, 6, 12].includes(span))
            width += span
            items++
            assert.ok(width <= 12)
            if (width === 12) {
                rows.push(items)
                width = 0
                items = 0
            }
        }
        assert.equal(width, 0)
        return rows
    }
    assert.deepEqual(rowCounts(13), [4, 4, 3, 2])
    assert.deepEqual(rowCounts(11), [4, 4, 3])
    assert.deepEqual(rowCounts(5), [3, 2])
    assert.deepEqual(rowCounts(2), [2])
    assert.deepEqual(rowCounts(1), [1])
    for (let count = 0; count <= 40; count++) rowCounts(count)
})
