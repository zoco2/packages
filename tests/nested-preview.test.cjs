const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('../../tenant/node_modules/typescript')
const vue = require('../../tenant/node_modules/vue')
const { parse, compileScript } = require(require.resolve('@vue/compiler-sfc', { paths: [require.resolve('../../tenant/node_modules/vue')] }))
const { renderToString } = require(require.resolve('@vue/server-renderer', { paths: [require.resolve('../../tenant/node_modules/vue')] }))

test('nested editor containers and descendants use the active site asset resolver', async () => {
    const filename = path.join(__dirname, '../../tenant/src/views/decoration/component/pages/nested-widget-preview.vue')
    const compiled = compileScript(parse(fs.readFileSync(filename, 'utf8')).descriptor, { id: 'nested-assets', inlineTemplate: true }).content
    const draggable = { props: ['modelValue'], setup: (props, { slots }) => () => vue.h('div', props.modelValue.map(element => slots.item({ element }))) }
    const renderer = { props: ['widgets', 'adapters'], setup: props => () => vue.h('img', { src: props.adapters.resolveImage(props.widgets[0].content.image) }) }
    const target = { exports: {}, require: name => name === 'vue' ? vue : name === 'vuedraggable' ? { default: draggable } : name === '@mobile-decoration-renderer' ? { default: renderer } : { normalizeMobileWidgetStyles: value => ({ opacity: 100, ...value }) } }
    vm.runInNewContext(ts.transpileModule(compiled, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, target)
    const leaf = { id: 'region', name: 'image-hotspot', content: { image: 'resource/region.png' } }
    const widget = { name: 'section', styles: { background_image: 'resource/hero.png' }, children: [{ id: 'inner', name: 'card', styles: {}, children: [leaf] }] }
    const html = await renderToString(vue.createSSRApp(target.exports.default, { widget, adapters: { resolveImage: value => '/' + value } }))
    assert.ok(html.includes('url(/resource/hero.png)'))
    assert.ok(html.includes('src="/resource/region.png"'))
})
