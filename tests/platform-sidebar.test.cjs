const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('../../platform/node_modules/typescript')

function loadTs(filename) {
    const source = fs.readFileSync(filename, 'utf8')
    const context = { exports: {}, require: name => {
        if (name === '@/utils/util') return { getNormalPath: value => value.replace(/\/+/g, '/') }
        if (name === '@/utils/validate') return { isExternal: value => /^https?:/.test(value) }
        if (name === '@/enums/appEnums') return { MenuEnum: { MENU: 'C' } }
        if (name.startsWith('.')) return loadTs(path.resolve(path.dirname(filename), `${name}.ts`))
        throw new Error(`Unexpected dependency: ${name}`)
    } }
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context)
    return context.exports
}
const { buildSidebarRoutes } = loadTs(path.join(__dirname, '../../platform/src/layout/default/utils/app-menu.ts'))
const menu = (path, title, children, meta = {}) => ({ path, meta: { title, hidden: false, ...meta }, ...(children ? { children } : {}) })
function fixture() {
    return [
        menu('/apps', '应用管理', [
            menu('center', '应用中心'),
            menu('system-default', '系统应用', [
                menu('message', '消息管理', [menu('notice', '通知设置'), menu('short-letter', '短信设置'), menu('point-alert', '点数预警')])
            ], { appCode: 'system_default', source: 'app' })
        ], { sourceMenuKey: 'core_app_center' }),
        menu('/setting', '系统设置', [menu('website', '网站设置', [menu('info', '网站信息')]), menu('storage', '存储设置')])
    ]
}
function flatten(routes, base = '') {
    return routes.flatMap(route => {
        if (route.meta?.hidden) return []
        const fullPath = route.path.startsWith('/') ? route.path : `${base}/${route.path}`
        return [{ title: route.meta?.title, path: fullPath }, ...flatten(route.children || [], fullPath)]
    })
}

test('platform: website settings exposes existing message menus with their registered URLs', () => {
    const input = fixture()
    const original = JSON.stringify(input)
    const result = buildSidebarRoutes(input)
    const website = result.find(route => route.meta.title === '网站设置')
    assert.ok(website.children.some(route => route.meta.title === '消息管理'))
    const items = flatten(result)
    for (const [title, suffix] of [['通知设置', 'notice'], ['短信设置', 'short-letter'], ['点数预警', 'point-alert']]) {
        assert.equal(items.find(item => item.title === title)?.path, `/apps/system-default/message/${suffix}`)
    }
    assert.ok(items.some(item => item.title === '应用市场'))
    assert.ok(items.some(item => item.path === '/setting/storage'))
    assert.equal(JSON.stringify(input), original)
})

test('platform: message recovery is independent of source menu ordering', () => {
    assert.ok(flatten(buildSidebarRoutes(fixture().reverse())).some(item => item.title === '点数预警'))
})

test('platform: hidden ancestors and unauthorized children are not restored', () => {
    for (const level of [0, 1, 2]) {
        const input = fixture()
        const ancestors = [input[0], input[0].children[1], input[0].children[1].children[0]]
        ancestors[level].meta.hidden = true
        assert.equal(flatten(buildSidebarRoutes(input)).some(item => item.title === '点数预警'), false)
    }
    const input = fixture()
    input[0].children[1].children[0].children.pop()
    assert.equal(flatten(buildSidebarRoutes(input)).some(item => item.title === '点数预警'), false)
})

test('platform: accounts without website permissions keep messaging in application center', () => {
    const input = fixture().slice(0, 1)
    const output = buildSidebarRoutes(input)
    assert.ok(output.find(route => route.meta.title === '应用中心').children.some(route => route.meta.title === '消息管理'))
    assert.ok(flatten(output).some(item => item.path === '/apps/system-default/message/point-alert'))
})

test('platform: business apps are not promoted and already placed messages are not duplicated', () => {
    const input = fixture()
    input[0].children.push(menu('other-app', '业务应用', [menu('message', '消息管理', [menu('other', '业务消息')])], { source: 'app', appCode: 'other' }))
    input[1].children[0].children.push(menu('message', '消息管理', [menu('point-alert', '点数预警')]))
    const items = flatten(buildSidebarRoutes(input))
    assert.equal(items.filter(item => item.title === '消息管理').length, 1)
    assert.equal(items.some(item => item.title === '业务消息'), false)
})

for (const terminal of ['platform', 'tenant']) {
    const build = loadTs(path.join(__dirname, `../../${terminal}/src/layout/default/utils/app-menu.ts`)).buildSidebarRoutes
    test(`${terminal}: all sidebar levels have registered icons while configured icons and input stay intact`, () => {
        const input = [menu('/website', '网站设置', [
            menu('info', '网站信息'), menu('storage', '存储设置'),
            menu('message', '消息管理', [menu('point-alert', '点数预警'), menu('notice', '通知设置'), menu('sms', '短信设置')]),
            menu('custom', '自定义菜单', undefined, { icon: 'local-icon-example' }),
            menu('other-group', '扩展分组', [menu('other', '扩展页面')]),
            menu('hidden', '隐藏页面', undefined, { hidden: true })
        ])]
        const original = JSON.stringify(input)
        const result = build(input)
        const icons = require(`../../${terminal}/node_modules/@element-plus/icons-vue`)
        const visit = routes => routes.forEach(route => {
            const icon = route.meta?.icon
            assert.ok(icon, `${route.meta?.title} needs an icon`)
            if (icon !== 'local-icon-example') assert.ok(icons[icon.replace('el-icon-', '')], `${icon} must exist`)
            visit(route.children || [])
        })
        visit(result)
        const messages = result[0].children.find(route => route.meta.title === '消息管理').children
        assert.equal(messages.find(route => route.meta.title === '通知设置').meta.icon, 'el-icon-Notification')
        assert.equal(messages.find(route => route.meta.title === '短信设置').meta.icon, 'el-icon-ChatLineSquare')
        assert.equal(result[0].children.find(route => route.path === 'custom').meta.icon, 'local-icon-example')
        assert.equal(result[0].children.find(route => route.path === 'hidden').meta.hidden, true)
        assert.equal(JSON.stringify(input), original)
    })
}

test('platform: promoted storage settings retain an icon', () => {
    const website = buildSidebarRoutes(fixture()).find(route => route.meta.title === '网站设置')
    assert.equal(website.children.find(route => route.meta.title === '存储设置').meta.icon, 'el-icon-FolderOpened')
})
