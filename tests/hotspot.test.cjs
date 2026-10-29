const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('../../tenant/node_modules/typescript')
const file = path.join(__dirname, '../decoration-core/hotspot.ts')
const context = { exports: {} }
if (fs.existsSync(file)) vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context)
const h = context.exports
const plain = value => JSON.parse(JSON.stringify(value))

test('draw, move and resize stay inside the image at different canvas sizes', () => {
    for (const width of [320, 375, 390]) {
        const bounds = { left: 10, top: 30, width, height: width / 2 }
        const start = h.hotspotPoint(10 + width * 0.8, 30 + width / 2 * 0.8, bounds)
        const end = h.hotspotPoint(10 + width * 0.2, 30 + width / 2 * 0.2, bounds)
        const area = h.hotspotRectangle(start, end)
        assert.deepEqual(plain(area), { left: 20, top: 20, width: 60, height: 60 })
        const moved = h.moveHotspotArea(area, 90, -40)
        assert.equal(moved.left + moved.width, 100)
        assert.equal(moved.top, 0)
        const resized = h.resizeHotspotArea(moved, 200, 200)
        assert.equal(resized.left + resized.width, 100)
        assert.equal(resized.top + resized.height, 100)
    }
})

test('invalid persisted areas are bounded without losing unknown fields or links', () => {
    const original = { left: 80, top: -10, width: 50, height: Infinity, custom: 'retain', link: { path: '/pages/diy/diy', query: { code: 'works' } } }
    const result = h.normalizeHotspotArea(original)
    assert.equal(result.left, 80)
    assert.equal(result.width, 20)
    assert.equal(result.top, 0)
    assert.ok(Number.isFinite(result.height))
    assert.equal(result.custom, 'retain')
    assert.deepEqual(plain(result.link), plain(original.link))
    assert.equal(original.width, 50)
})

test('new automatic images and legacy fixed images keep predictable image modes', () => {
    assert.equal(h.hotspotHeightMode({ height_mode: 'auto', height: 200 }), 'auto')
    assert.equal(h.hotspotImageMode({ height_mode: 'auto' }), 'widthFix')
    assert.equal(h.hotspotHeightMode({ height: 200 }), 'fixed')
    assert.equal(h.hotspotImageMode({ height: 200, fit: 'contain' }), 'aspectFit')
    assert.equal(h.hotspotImageMode({ height: 200, fit: 'fill' }), 'scaleToFill')
})

test('each area preserves its own page query and unsupported script links are rejected', () => {
    assert.equal(h.hotspotHref({ link: { path: '/pages/diy/diy', query: { code: 'works', tenant_id: 1 } } }), '/pages/diy/diy?code=works&tenant_id=1')
    assert.equal(h.hotspotHref({ link: { path: '/pages/diy/diy?code=home#top', query: { code: 'inspiration' } } }), '/pages/diy/diy?code=inspiration#top')
    assert.equal(h.hotspotHref({ link: { path: 'javascript:alert(1)' } }), '')
    for (const path of ['java\nscript:alert(1)', 'java\tscript:alert(1)', '/\\evil.example', 'https://good.example/\u0000bad']) {
        assert.equal(h.hotspotHref({ link: { path } }), '')
    }
    assert.equal(h.hotspotHref({ type: 'phone', phone: '+86 138-0000-0000' }), 'tel:+8613800000000')
})

test('only the selected area dispatches its configured action', () => {
    const calls = []
    const adapters = { navigate: link => calls.push(['link', link.path]), phone: phone => calls.push(['phone', phone]), backTop: () => calls.push(['top']), customerService: () => calls.push(['service']) }
    h.runHotspotAction({ link: { path: '/pages/a' } }, adapters)
    h.runHotspotAction({ type: 'back_top' }, adapters)
    h.runHotspotAction({ type: 'customer_service' }, adapters)
    h.runHotspotAction({ type: 'phone', phone: '13800000000' }, adapters)
    h.runHotspotAction({ type: 'script', script: 'bad' }, adapters)
    assert.deepEqual(calls, [['link', '/pages/a'], ['top'], ['service'], ['phone', '13800000000']])
})

test('UniApp navigation receives the same merged URL as the browser anchor', () => {
    const calls = []
    const target = { exports: {}, uni: { navigateTo: ({ url }) => calls.push(url) }, require: name => {
        if (name === './native-decoration-tabs') return { nativeTabPathForLink: () => '' }
        if (name === './tenant') return { appendTenantIdToUrl: url => url }
        return {}
    } }
    const filename = path.join(__dirname, '../../uniapp/src/utils/util.ts')
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, target)
    const area = { link: { path: '/pages/diy/diy?code=home#top', query: { code: 'works', tenant_id: 7 }, type: 'shop' } }
    const adapters = { navigate: target.exports.navigateTo, customerService: link => link && target.exports.navigateTo(link), phone() {}, backTop() {} }
    h.runHotspotAction(area, adapters)
    h.runHotspotAction({ ...area, type: 'customer_service' }, adapters)
    assert.deepEqual(calls, [h.hotspotHref(area), h.hotspotHref(area)])
    h.runHotspotAction({ link: { path: 'java\nscript:alert(1)' } }, adapters)
    assert.equal(calls.length, 2)
})

test('mini-program hotspots retain the structured destination through the real adapter', () => {
    const opened = [], native = []
    const target = { exports: {}, window: { open: url => opened.push(url) }, uni: { navigateToMiniProgram: options => native.push(options) }, require: name => name === 'uniapp-router-next' ? { parseQuery: () => ({ id: '2' }) } : {} }
    const filename = path.join(__dirname, '../../uniapp/src/utils/util.ts')
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, target)
    const area = { link: { type: 'mini_program', path: '/pages/index/index', query: { appId: 'wx123456789', path: 'pages/index/index', env_version: 'release', query: 'id=2' } } }
    const before = JSON.stringify(area)
    h.runHotspotAction(area, { navigate: target.exports.navigateTo, phone() {}, backTop() {}, customerService() {} })
    assert.equal(native[0].appId, area.link.query.appId)
    assert.equal(native[0].path, area.link.query.path)
    assert.equal(native[0].envVersion, 'release')
    assert.ok(opened[0].includes('appid=wx123456789'))
    assert.ok(h.hotspotHref(area).includes('path=pages%2Findex%2Findex'))
    assert.equal(JSON.stringify(area), before)
    assert.equal(h.hotspotHref({ link: { type: 'mini_program', query: { appId: 'bad&script', path: '/pages/x' } } }), '')
})

test('actual browser component renders transparent targets without visible labels in view mode', async () => {
    const vue = require('../../tenant/node_modules/vue')
    const { parse, compileScript } = require(require.resolve('@vue/compiler-sfc', { paths: [require.resolve('../../tenant/node_modules/vue')] }))
    const { renderToString } = require(require.resolve('@vue/server-renderer', { paths: [require.resolve('../../tenant/node_modules/vue')] }))
    const filename = path.join(__dirname, '../mobile-decoration/HotspotImage.vue')
    const compiled = compileScript(parse(fs.readFileSync(filename, 'utf8')).descriptor, { id: 'hotspot-render', inlineTemplate: true }).content
    const target = { exports: {}, require: name => name === 'vue' ? vue : h }
    vm.runInNewContext(ts.transpileModule(compiled, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, target)
    const props = { image: '/region.png', content: { image: '/region.png', height_mode: 'auto', areas: [
        { name: '视频创作', left: 0, top: 0, width: 50, height: 100, link: { path: '/pages/a' } },
        { name: '图片创作', left: 50, top: 0, width: 50, height: 100, link: { path: '/pages/b' } }
    ] } }
    const html = await renderToString(vue.createSSRApp(target.exports.default, { ...props, mode: 'view' }))
    assert.equal((html.match(/class="hotspot-target"/g) || []).length, 2)
    assert.ok(html.includes('href="/pages/a"') && html.includes('href="/pages/b"'))
    assert.equal(html.includes('>视频创作</span>'), false)
    assert.equal(html.includes('is-edit'), false)
    const editor = await renderToString(vue.createSSRApp(target.exports.default, { ...props, mode: 'edit' }))
    assert.ok(editor.includes('>视频创作</span>'))
    assert.equal(editor.includes('href="/pages/a"'), false)
    const empty = await renderToString(vue.createSSRApp(target.exports.default, { image: '', content: { areas: props.content.areas }, mode: 'view' }))
    assert.equal(empty.includes('hotspot-target'), false)
})

test('actual UniApp component dispatches one action and keeps legacy image-fit behavior', () => {
    const vue = require('../../tenant/node_modules/vue')
    const { parse, compileScript } = require(require.resolve('@vue/compiler-sfc', { paths: [require.resolve('../../tenant/node_modules/vue')] }))
    const filename = path.join(__dirname, '../../uniapp/src/components/diy/diy-hotspot.vue')
    const compiled = compileScript(parse(fs.readFileSync(filename, 'utf8')).descriptor, { id: 'hotspot-native' }).content
    const calls = []
    const target = { exports: {}, uni: { makePhoneCall: options => calls.push(['phone', options.phoneNumber]), pageScrollTo: () => calls.push(['top']), showToast: () => calls.push(['missing']) }, require: name => name === 'vue' ? vue : h }
    vm.runInNewContext(ts.transpileModule(compiled, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, target)
    const component = target.exports.default.setup({ image: '/region.png', content: { image: '/region.png', height: 200, fit: 'contain', areas: [] } }, { expose() {}, emit: (_, link) => calls.push(['link', link.path]) })
    component.activate({ link: { path: '/pages/a', query: { code: 'x' } } })
    component.activate({ type: 'phone', phone: '13800000000' })
    component.activate({ type: 'back_top' })
    component.activate({ type: 'customer_service', link: { path: '/pages/service' } })
    assert.deepEqual(calls, [['link', '/pages/a?code=x'], ['phone', '13800000000'], ['top'], ['link', '/pages/service']])
    assert.equal(component.automatic.value, false)
    assert.equal(component.frameStyle.value.height, '200rpx')
})

test('actual canvas draws, moves, resizes and cancels using the visible image bounds', () => {
    const vue = require('../../tenant/node_modules/vue')
    const { parse, compileScript } = require(require.resolve('@vue/compiler-sfc', { paths: [require.resolve('../../tenant/node_modules/vue')] }))
    const filename = path.join(__dirname, '../../tenant/src/views/decoration/component/widgets/image-hotspot/HotspotCanvas.vue')
    const compiled = compileScript(parse(fs.readFileSync(filename, 'utf8')).descriptor, { id: 'hotspot-editor' }).content
    const target = { exports: {}, require: name => name === 'vue' ? vue : h }
    vm.runInNewContext(ts.transpileModule(compiled, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, target)
    const props = vue.reactive({ image: '/region.png', content: { height_mode: 'auto', areas: [] }, selected: -1, drawing: true })
    const changes = []
    const component = target.exports.default.setup(props, { expose() {}, emit(event, value) {
        if (event === 'change') { changes.push(plain(value)); props.content.areas = value }
        if (event === 'update:drawing') props.drawing = value
        if (event === 'update:selected') props.selected = value
    } })
    component.canvas.value = { getBoundingClientRect: () => ({ left: 10, top: 20, width: 375, height: 200 }), setPointerCapture() {}, hasPointerCapture: () => true, releasePointerCapture() {} }
    const pointer = (x, y) => ({ clientX: 10 + x * 3.75, clientY: 20 + y * 2, button: 0, pointerId: 1, preventDefault() {} })
    component.startDraw(pointer(10, 10)); component.move(pointer(50, 60)); component.finish(pointer(50, 60))
    assert.equal(changes.length, 1)
    assert.equal(changes[0][0].left, 10)
    assert.equal(changes[0][0].width, 40)
    assert.equal(changes[0][0].height, 50)
    component.startArea(pointer(20, 20), 0, 'move'); component.finish(pointer(100, 100))
    assert.equal(changes[1][0].left + changes[1][0].width, 100)
    assert.equal(changes[1][0].top + changes[1][0].height, 100)
    component.startArea(pointer(90, 90), 0, 'resize'); component.finish(pointer(80, 80))
    assert.equal(changes[2][0].width, 30)
    component.startArea(pointer(70, 70), 0, 'move'); component.move(pointer(0, 0)); component.cancel()
    assert.equal(changes.length, 3)
    assert.equal(component.shownAreas.value[0].left, changes[2][0].left)
})

test('an optional crop viewport scales the asset while click percentages stay unchanged', () => {
    assert.deepEqual(plain(h.hotspotCropStyle({ height_mode: 'auto', crop_x: 20 })), {})
    assert.deepEqual(plain(h.hotspotCropStyle({ height_mode: 'fixed', height: 200 })), {})
    const crop = h.hotspotCropStyle({ height_mode: 'fixed', crop_x: 10, crop_y: 20, crop_width: 80, crop_height: 50 })
    assert.equal(crop.width, '125%')
    assert.equal(crop.height, '200%')
    assert.equal(crop.left, '-12.5%')
    assert.equal(crop.top, '-40%')
    assert.equal(h.hotspotAreaStyle({ left: 50, top: 50, width: 20, height: 20 }).left, '50%')
    for (const value of Object.values(h.hotspotCropStyle({ height: 100, crop_x: 101, crop_y: -20, crop_width: NaN, crop_height: Infinity }))) assert.ok(!String(value).includes('NaN'))
})
