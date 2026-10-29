const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('../../tenant/node_modules/typescript')

function link(terminal, routePath, query) {
    const root = path.join(__dirname, '../..', terminal)
    const source = fs.readFileSync(path.join(root, 'src/layout/default/components/sidebar/menu-item.vue'), 'utf8')
    const expression = source.match(/<app-link[^>]+:to="([^"]+)"/)[1]
    const script = source.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1]
    const utilSource = fs.readFileSync(path.join(root, 'src/utils/util.ts'), 'utf8')
    const utilAst = ts.createSourceFile('util.ts', utilSource, ts.ScriptTarget.Latest, true)
    const wanted = utilAst.statements.filter(s => (ts.isFunctionDeclaration(s) && s.name?.text === 'objectToQuery') || (ts.isVariableStatement(s) && s.declarationList.declarations.some(d => d.name.getText(utilAst) === 'isEmpty')))
    const utilCode = ts.transpileModule(wanted.map(s => s.getText(utilAst)).join('\n'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
    const utils = { exports: {}, isObject: value => value !== null && typeof value === 'object' }
    vm.runInNewContext(utilCode, utils)
    const context = { exports: {}, require: name => name === '@/utils/util' ? utils.exports : { isExternal: value => /^(https?:|mailto:|tel:)/.test(value) },
        defineProps: () => ({ route: { meta: { query } }, routePath }),
        computed: fn => ({ get value() { return fn() } }) }
    // Vue templates unwrap computed refs and props automatically.
    const unwrapped = expression.replace(/\b(queryStr|routeLink)\b/g, '$1.value').replace(/\broutePath\b/g, 'props.routePath')
    const executable = ts.transpileModule(script + '\nglobalThis.getLink = () => (' + unwrapped + ')', { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
    vm.runInNewContext(executable, context)
    return context.getLink()
}
for (const terminal of ['tenant', 'platform']) {
    test(`${terminal}: menus without defaults do not add a question mark or undefined`, () => {
        for (const query of [undefined, null, '', '{}', 'null', {}]) assert.equal(link(terminal, '/channel/overview', query), '/channel/overview')
    })
    test(`${terminal}: preserve encoded JSON defaults and legacy query strings`, () => {
        assert.equal(link(terminal, '/user/edit', '{"id":1,"name":"张三"}'), '/user/edit?id=1&name=%E5%BC%A0%E4%B8%89')
        assert.equal(link(terminal, '/user/edit', 'id=1'), '/user/edit?id=1')
        assert.equal(link(terminal, '/user/edit', '?id=1'), '/user/edit?id=1')
    })
    test(`${terminal}: existing query and hash stay valid with one query delimiter`, () => {
        assert.equal(link(terminal, '/user/edit?tenant_id=2#profile', '{"id":1}'), '/user/edit?tenant_id=2&id=1#profile')
        assert.equal(link(terminal, 'https://example.com/report?lang=zh#result', 'id=1'), 'https://example.com/report?lang=zh&id=1#result')
    })
}
