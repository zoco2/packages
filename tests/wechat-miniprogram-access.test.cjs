const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('../../tenant/node_modules/typescript')
const sourcePath = path.join(__dirname, '../wechat-miniprogram-access.ts')
function api() {
    assert.ok(fs.existsSync(sourcePath), 'shared miniprogram access policy must exist')
    const context = { exports: {} }
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context)
    return context.exports
}
test('missing, free, expired and malformed capability never enable miniprogram', () => {
    const { miniprogramEnabled } = api()
    for (const config of [{}, { channel_capabilities: { miniprogram: { enabled: false } } }, { channel_capabilities: { miniprogram: { enabled: 'true' } } }, { site_license: { edition: 'commercial', can_customize: true } }]) {
        assert.equal(miniprogramEnabled(config), false)
    }
    assert.equal(miniprogramEnabled({ channel_capabilities: { miniprogram: { enabled: true } } }), true)
})
test('new, legacy, query and platform routes are protected while official and H5 stay accessible', () => {
    const { isMiniprogramRoute } = api()
    for (const route of [
        { path: '/channel/miniprogram' }, { path: '/channel/weapp' },
        { path: '/channel/open_platform/miniprogram' }, { path: '/channel/open_platform/versions' },
        { path: '/channel/overview', query: { channel: 'miniprogram', tab: 'basic' } },
        { path: '/channel/authorize', query: { type: 'miniprogram' } },
        { path: '/channel/custom', meta: { perms: 'channel.mnp_settings/getConfig' } }
    ]) assert.equal(isMiniprogramRoute(route), true, route.path)
    for (const route of [
        { path: '/channel/overview' }, { path: '/channel/authorize', query: { type: 'official' } },
        { path: '/channel/overview', query: { channel: 'official' } },
        { path: '/channel/h5' }, { path: '/channel/open_platform/config' }, { path: '/upgrade/license' }
    ]) assert.equal(isMiniprogramRoute(route), false, route.path)
})
test('unlicensed menu removes miniprogram children and empty groups without changing input', () => {
    const { filterMiniprogramMenus } = api()
    const input = [{ paths: 'channel', children: [
        { paths: 'overview', component: 'channel/index' },
        { paths: 'weapp', component: 'channel/weapp' },
        { paths: 'old', component: 'channel/open_platform/index', params: '{"type":"miniprogram"}' }
    ] }, { paths: 'legacy', children: [{ paths: 'mini', component: 'channel/open_platform/miniprogram' }] }]
    const filtered = filterMiniprogramMenus(input, false)
    assert.equal(filtered.length, 1)
    assert.equal(filtered[0].children.length, 1)
    assert.equal(input[0].children.length, 3)
    assert.equal(filterMiniprogramMenus(input, true), input)
})
function loadOverview(enabled) {
    const vue = require('../../tenant/node_modules/vue')
    const source = fs.readFileSync(path.join(__dirname, '../../tenant/src/views/channel/index.vue'), 'utf8').split(/<script[^>]*>/)[1].split('</script>')[0]
    const appStore = vue.reactive({ config: { channel_capabilities: { miniprogram: { enabled } } }, getConfig: async () => {} })
    let configCalls = 0
    const route = vue.reactive({ path: '/channel/overview', query: {} })
    const context = {
        exports: {}, ...vue, useRoute: () => route, useRouter: () => ({ replace() {}, push() {} }),
        require: name => ({
            '@element-plus/icons-vue': {}, 'element-plus': { ElMessage: { success() {}, error() {} }, ElMessageBox: {} },
            '@/stores/modules/app': { default: () => appStore }, '@/utils/miniprogram-access': api(),
            '@/api/channel/open_platform': { getAccounts: async () => [{ authorizer_type: 'miniprogram', authorization_status: 1 }] },
            '@/api/channel/weapp': { getWeappConfig: async () => { configCalls++; return { app_id: 'stored-mini', app_secret: 'stored-secret' } } },
            '@/api/channel/wx_oa': { getOaConfig: async () => ({ app_id: 'official', app_secret: 'secret' }) },
            '@/utils/wechat-authorize': {}, './open_platform/official.vue': {}, './open_platform/miniprogram.vue': {},
            './h5.vue': {}, './open_setting.vue': {}
        })[name]
    }
    vm.runInNewContext(ts.transpileModule(source + '\nglobalThis.overview = { channels, embeddedChannel, load };', { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context)
    return { overview: context.overview, appStore, route, configCalls: () => configCalls }
}
test('unlicensed overview shows helpful notice with zero mini actions and never reads mini credentials', async () => {
    const page = loadOverview(false)
    await page.overview.load()
    const mini = page.overview.channels.value.find(c => c.code === 'miniprogram')
    assert.equal(mini.actions.length, 0)
    assert.equal(mini.status, '未开通')
    assert.match(mini.description, /商业授权专属/)
    assert.equal(page.configCalls(), 0)
    page.route.query.channel = 'miniprogram'
    assert.equal(page.overview.embeddedChannel.value, null)
    const official = page.overview.channels.value.find(c => c.code === 'official')
    assert.ok(official.actions.length > 0)
})
test('licensed overview keeps existing mini actions and refresh reflects license removal', async () => {
    const page = loadOverview(true)
    await page.overview.load()
    assert.ok(page.overview.channels.value.find(c => c.code === 'miniprogram').actions.length > 0)
    assert.ok(page.configCalls() > 0)
    page.appStore.config.channel_capabilities.miniprogram.enabled = false
    await page.overview.load()
    assert.equal(page.overview.channels.value.find(c => c.code === 'miniprogram').actions.length, 0)
})
for (const surface of ['tenant', 'platform']) {
    test(`${surface} guard refreshes authorization and rejects direct URL before rendering`, async () => {
        const source = fs.readFileSync(path.join(__dirname, `../../${surface}/src/permission.ts`), 'utf8')
        const store = { config: {}, getConfig: async () => { store.config = { channel_capabilities: { miniprogram: { enabled: false } } } } }
        let guard
        const notices = []
        const context = { exports: {}, document: {}, console, require: name => ({
            'nprogress/nprogress.css': {}, nprogress: { default: { configure() {}, start() {}, done() {} } },
            'element-plus': { ElMessage: { warning: message => notices.push(message) } },
            '@/stores/modules/app': { default: () => store }, '@/utils/miniprogram-access': api(),
            './config': { default: { title: 'test' } }, './enums/pageEnum': { PageEnum: { LOGIN: '/login', ERROR_403: '/403', INDEX: '/' } },
            './router': { default: { beforeEach: callback => { guard = callback }, afterEach() {} } }, './router/routes': {},
            './stores/modules/multipleTabs': { default: () => ({}) },
            './stores/modules/user': { default: () => ({ token: 'signed-in', userInfo: { root: 1 } }) },
            './utils/auth': {}, './utils/tenant': { parseTenantIdFromLocation: () => 7, normalizeTenantPath: p => p, getSsoTicket: () => '', withTenantQuery: r => r }, './utils/validate': {}
        })[name] }
        vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context)
        let destination
        await guard({ path: '/channel/miniprogram', fullPath: '/channel/miniprogram', meta: {}, query: { tenant_id: 7 } }, {}, target => { destination = target })
        assert.equal(destination.path, surface === 'tenant' ? '/channel/overview' : '/channel/open_platform/config')
        assert.equal(notices.length, 1)
        store.getConfig = async () => { store.config.channel_capabilities.miniprogram.enabled = true }
        destination = 'unset'
        await guard({ path: '/channel/miniprogram', meta: {}, query: { tenant_id: 7 } }, {}, target => { destination = target })
        assert.equal(destination, undefined)
        store.getConfig = async () => { throw new Error('network failure') }
        await guard({ path: '/channel/miniprogram', meta: {}, query: { tenant_id: 7 } }, {}, target => { destination = target })
        assert.ok(destination.path)
        assert.equal(store.config.channel_capabilities.miniprogram.enabled, true, 'network failure must not erase branding or unrelated config')
    })
}
