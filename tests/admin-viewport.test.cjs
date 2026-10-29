const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('../../platform/node_modules/typescript')
const vue = require('../../platform/node_modules/vue')
const { parse } = require('../../platform/node_modules/vue/compiler-sfc')

const root = path.join(__dirname, '../..')
function loadTs(file) {
    const module = { exports: {} }
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS }
    }).outputText, { module, exports: module.exports })
    return module.exports
}
function fixture(terminal, initialWidth, touchOnly = false) {
    const width = vue.ref(initialWidth), touch = vue.ref(touchOnly)
    const store = vue.reactive({
        isMobile: true, isCollapsed: false,
        setMobile(value) { this.isMobile = value },
        toggleCollapsed(value) { this.isCollapsed = value ?? !this.isCollapsed }
    })
    const filename = path.join(root, terminal, 'src/App.vue')
    const script = parse(fs.readFileSync(filename, 'utf8')).descriptor.scriptSetup.content
    const context = {
        ...vue, exports: {}, onMounted() {},
        require(name) {
            if (name === '@vueuse/core') return {
                useDark: () => vue.ref(false), useWindowSize: () => ({ width }),
                useMediaQuery: () => touch, useThrottleFn: fn => fn
            }
            if (name.includes('stores/modules/app')) return { default: () => store }
            if (name.includes('stores/modules/setting')) return { default: () => ({ setTheme() {} }) }
            if (name.includes('element-plus')) return { default: {} }
            return loadTs(path.resolve(path.dirname(filename), name + '.ts'))
        }
    }
    const scope = vue.effectScope()
    scope.run(() => vm.runInNewContext(ts.transpileModule(script, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
    }).outputText, context))
    return { width, touch, store, stop: () => scope.stop() }
}
for (const terminal of ['platform', 'tenant']) {
    test(`${terminal}: tablet portrait and landscape start with a closed drawer, never a hover-only icon rail`, t => {
        for (const width of [375, 744, 768, 820, 1024]) {
            const f = fixture(terminal, width); t.after(f.stop)
            assert.equal(f.store.isMobile, true, `${width}px needs drawer navigation`)
            assert.equal(f.store.isCollapsed, true, `${width}px drawer starts closed`)
        }
    })
    test(`${terminal}: large touch-only tablets still use expanded menus inside a drawer`, t => {
        const f = fixture(terminal, 1366, true); t.after(f.stop)
        assert.equal(f.store.isMobile, true)
        assert.equal(f.store.isCollapsed, true)
    })
    test(`${terminal}: resizing within desktop mode preserves the manual collapsed state`, async t => {
        const f = fixture(terminal, 1280); t.after(f.stop)
        assert.equal(f.store.isMobile, false)
        assert.equal(f.store.isCollapsed, false)
        f.store.toggleCollapsed(true)
        f.width.value = 1300; await vue.nextTick()
        assert.equal(f.store.isCollapsed, true)
    })
    test(`${terminal}: tablet resizes preserve an open drawer and desktop transitions close it`, async t => {
        const f = fixture(terminal, 820); t.after(f.stop)
        assert.equal(f.store.isMobile, true)
        f.store.toggleCollapsed(false)
        f.width.value = 1024; await vue.nextTick()
        assert.equal(f.store.isMobile, true)
        assert.equal(f.store.isCollapsed, false)
        f.width.value = 1280; await vue.nextTick()
        assert.equal(f.store.isMobile, false)
        assert.equal(f.store.isCollapsed, false)
        f.width.value = 820; await vue.nextTick()
        assert.equal(f.store.isMobile, true)
        assert.equal(f.store.isCollapsed, true)
    })
    test(`${terminal}: losing hover capability closes desktop popovers into drawer mode`, async t => {
        const f = fixture(terminal, 1366); t.after(f.stop)
        f.touch.value = true; await vue.nextTick()
        assert.equal(f.store.isMobile, true)
        assert.equal(f.store.isCollapsed, true)
        f.touch.value = false; await vue.nextTick()
        assert.equal(f.store.isMobile, false)
        assert.equal(f.store.isCollapsed, false)
    })
}
