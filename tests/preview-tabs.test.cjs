const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('../../tenant/node_modules/typescript')
const vue = require('../../tenant/node_modules/vue')
const { parse, compileScript } = require(require.resolve('@vue/compiler-sfc', { paths: [require.resolve('../../tenant/node_modules/vue')] }))
function compile(source, require, globals = {}) {
    const target = { exports: {}, require, ...globals }
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, target)
    return target.exports
}
test('draft tabs select by page code and preserve draft context without retaining page id', () => {
    const route = { path: '/pages/diy/diy', query: { code: 'home', preview: 1, template_id: 46, page_id: 1075 } }
    const settings = { mobile_tabbar: { list: ['home', 'inspiration', 'works', 'user'].map(code => ({ name: code, is_show: 1, selected: '/on.png', unselected: '/off.png', link: { path: '/pages/diy/diy', query: { code, page_id: 1075, tenant_id: 1 }, canTab: true } })) } }
    const calls = [], replaced = [], before = JSON.stringify(settings)
    const navigation = compile(fs.readFileSync(path.join(__dirname, '../../uniapp/src/utils/util.ts'), 'utf8'), name => name === '@vue/shared' ? require('../../tenant/node_modules/@vue/shared') : name.endsWith('/native-decoration-tabs') ? { nativeTabPathForLink: () => '' } : name.endsWith('/tenant') ? { appendTenantIdToUrl: url => url } : {}, { uni: { redirectTo: ({ url }) => replaced.push(url) } })
    const tabHelpers = compile(fs.readFileSync(path.join(__dirname, '../../uniapp/src/utils/decoration-tabbar.ts'), 'utf8'), name => name.includes('mobile-decoration/tabbar') ? compile(fs.readFileSync(path.join(__dirname, '../mobile-decoration/tabbar.ts'), 'utf8'), () => ({})) : ({}))
    const filename = path.join(__dirname, '../../uniapp/src/components/diy/diy-preview-tabs.vue')
    const source = compileScript(parse(fs.readFileSync(filename, 'utf8')).descriptor, { id: 'draft-tabs' }).content
    const component = compile(source, name => name === 'vue' ? vue : name === 'uniapp-router-next' ? { useRoute: () => route } : name === '@/stores/app' ? { useAppStore: () => ({ getImageUrl: value => value }) } : name.endsWith('/decoration-tabbar') ? tabHelpers : { navigateTo: (link, mode) => { calls.push(link); navigation.navigateTo(link, mode) } }).default.setup({ settings, templateId: 46 }, { expose() {} })
    assert.equal(component.tabs.value.length, 4)
    assert.equal(component.current.value, 0)
    component.change(0)
    assert.equal(calls.length, 0)
    component.change(2)
    assert.equal(calls[0].query.code, 'works')
    assert.equal(calls[0].query.preview, 1)
    assert.equal(calls[0].query.template_id, 46)
    assert.equal(calls[0].query.tenant_id, 1)
    assert.equal('page_id' in calls[0].query, false)
    assert.equal(calls[0].canTab, false)
    assert.equal(replaced[0], '/pages/diy/diy?code=works&tenant_id=1&preview=1&template_id=46')
    assert.equal(JSON.stringify(settings), before)
})
