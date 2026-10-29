import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

// Compile the actual Vue components, including recursive nodes, instead of
// comparing source strings. Use the PC application's existing Vue toolchain.
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(here, '../../../pc/package.json'));
const { parse, compileScript } = require('vue/compiler-sfc');
const ts = require('typescript');
const { createSSRApp, h } = require('vue');
const { renderToString } = require('vue/server-renderer');
const modules = new Map();
async function load(filename) {
  if (modules.has(filename)) return modules.get(filename);
  const module = { exports: {} };
  modules.set(filename, module.exports);
  const raw = await readFile(filename, 'utf8');
  const source = filename.endsWith('.vue')
    ? compileScript(parse(raw, { filename }).descriptor, { id: filename, inlineTemplate: true }).content
    : raw;
  const imports = new Map();
  for (const match of source.matchAll(/from\s+["']([^"']+)["']/g)) {
    const spec = match[1];
    if (spec.endsWith('.vue') || spec.endsWith('.ts')) imports.set(spec, await load(resolve(dirname(filename), spec)));
    else if (spec.endsWith('.mjs')) imports.set(spec, await import(pathToFileURL(resolve(dirname(filename), spec))));
    else if (spec.startsWith('.')) imports.set(spec, await load(resolve(dirname(filename), spec + '.ts')));
  }
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext('(function(require,module,exports){' + code + '\n})', { console, setTimeout })(spec => imports.get(spec) || require(spec), module, module.exports);
  modules.set(filename, module.exports);
  return module.exports;
}
const Renderer = (await load(resolve(here, '../WebDocumentRenderer.vue'))).default;
const document = { fields: [], result: { mode: 'article' }, page: { nodes: [
  { id: 'submit', name: 'cw-submit', content: { text: '立即改写' } },
  { id: 'result', name: 'cw-result' },
] } };
const render = props => {
  const app = createSSRApp({ render: () => h(Renderer, { document, selectedModel: '1', ...props }) });
  app.provide(require('element-plus').ID_INJECTION_KEY, { prefix: 100, current: 0 });
  return renderToString(app);
};

test('submission errors render next to the submit button and are separate from result content', async () => {
  const html = await render({ error: '原始文案字数不符合要求' });
  assert.match(html, /cw-submit-block[\s\S]*立即改写[\s\S]*cw-submit-error[^>]*role="alert"[^>]*>原始文案字数不符合要求/);
  assert.ok(html.indexOf('原始文案字数不符合要求') < html.indexOf('class="cw-result"'));
});

test('partial body is visible while running, with copy and disabled regeneration in the result header', async () => {
  const html = await render({ task: { id: 71, status: 'running', result_text: '第一段实时正文' } });
  assert.match(html, /cw-result-head[\s\S]*aria-label="复制已生成内容"[\s\S]*disabled aria-label="重新生成"/);
  assert.match(html, /cw-result-text[^>]*>第一段实时正文/);
  assert.doesNotMatch(html, /正在等待模型输出正文/);
});

test('completed results expose icon actions before the body with regeneration enabled', async () => {
  const html = await render({ task: { id: 71, status: 'success', result_text: '已完成正文' } });
  assert.match(html, /aria-label="复制全文"[\s\S]*<svg/);
  assert.match(html, /class="cw-icon-button"[^>]*aria-label="重新生成"/);
  assert.doesNotMatch(html, /disabled aria-label="重新生成"/);
  assert.ok(html.indexOf('aria-label="重新生成"') < html.indexOf('已完成正文'));
});

test('copywriting fields and models use themed accessible selectors instead of OS-owned menus', async () => {
  const html = await render({
    document: { fields: [{ id: 'length', key: 'length', label: '生成篇幅', type: 'select', options: [{ value: 'medium', label: '适中' }] }],
      page: { nodes: [{ id: 'length-control', name: 'cw-field', content: { field_id: 'length' } }, { id: 'model-control', name: 'cw-model' }] } },
    values: { length: 'medium' }, modelOptions: [{ id: 1, name: '官方模型', channel_source: 'official' }], selectedModel: '1',
  });
  assert.doesNotMatch(html, /<select\b/);
  assert.equal((html.match(/role="combobox"/g) || []).length, 2);
  assert.match(html, /aria-label="生成篇幅"/);
  assert.match(html, /aria-label="选择模型"/);
});

test('text generation exposes the explicit upstream request receipt separately from the local task', async () => {
  const html = await render({ task: { id: 71, status: 'success', result_text: '正文', provider_request_id: 'provider-receipt-42' } });
  assert.match(html, /上游请求 ID/);
  assert.match(html, /provider-receipt-42/);
  assert.match(html, /aria-label="复制上游请求 ID"/);
  assert.match(html, /平台任务 ID/);
  assert.doesNotMatch(html, /上游任务 ID/);
});

test('native field updates preserve both fields when parent props have not propagated yet', async () => {
  const { defineComponent, inject } = require('vue');
  const nativeDir = resolve(here, '../../../uniapp/src/components/copywriting');
  const InputBoundary = defineComponent({ setup() {
    const ctx = inject('cw');
    ctx.update('source_text', '保留原始文案');
    ctx.update('requirements', '自然温暖');
    return () => null;
  } });
  modules.set(resolve(nativeDir, 'UniNode.vue'), { __esModule: true, default: InputBoundary });
  const NativeRenderer = (await load(resolve(nativeDir, 'UniDocumentRenderer.vue'))).default;
  let values = {};
  await renderToString(createSSRApp({ render: () => h(NativeRenderer, {
    document: { page: { nodes: [{ id: 'input' }] } }, values: {},
    onUpdateField: field => { values = { ...values, [field.key]: field.value }; },
    'onUpdate:values': snapshot => { values = snapshot; },
  }) }));
  assert.deepEqual(values, { source_text: '保留原始文案', requirements: '自然温暖' });
});
