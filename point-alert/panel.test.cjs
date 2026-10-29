const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  path = require("node:path");
const { createRequire } = require("node:module"),
  dep = createRequire(path.resolve(__dirname, "../../tenant/package.json"));
const vue = dep("vue"),
  ts = dep("typescript"),
  { parse, compileScript } = dep("vue/compiler-sfc");
function n(type, text = "") {
  return { type, text, props: {}, children: [], parent: null };
}
const renderer = vue.createRenderer({
  createElement: n,
  createText: (x) => n("#text", x),
  createComment: (x) => n("#comment", x),
  setText: (e, x) => (e.text = x),
  setElementText: (e, x) => {
    e.text = x;
    e.children = [];
  },
  patchProp: (e, k, o, v) => (e.props[k] = v),
  parentNode: (e) => e.parent,
  nextSibling: () => null,
  insert(e, p, a) {
    if (e.parent) e.parent.children.splice(e.parent.children.indexOf(e), 1);
    const i = a ? p.children.indexOf(a) : -1;
    p.children.splice(i < 0 ? p.children.length : i, 0, e);
    e.parent = p;
  },
  remove(e) {
    e.parent?.children.splice(e.parent.children.indexOf(e), 1);
  },
  querySelector: () => null,
  setScopeId() {},
  insertStaticContent() {
    throw Error("static");
  },
});
const all = (e) => [e, ...e.children.flatMap(all)],
  text = (e) =>
    e.type === "#comment" ? "" : e.text + e.children.map(text).join(""),
  button = (r, s) =>
    all(r).find((e) => e.type === "button" && text(e).includes(s)),
  tick = async () => {
    await new Promise(setImmediate);
    await vue.nextTick();
    await vue.nextTick();
  };
const rules = () => ({
  enabled: false,
  thresholds: ["1000.00", "200.00", "50.00"],
  channels: ["in_app"],
  level_channels: {},
  max_cycle: 3,
  max_daily: 3,
  min_interval_minutes: 60,
  repeat_enabled: false,
  repeat_hours: 24,
  sms_template_id: "",
  sms_variables: ["name", "points", "threshold"],
});
async function fixture(overrides = {}) {
  const calls = [],
    guards = [],
    messages = [];
  let current = { revision: 1, unit: "点", sms_ready: false, rules: rules() };
  const api = {
    rules: async () => current,
    save: async (p) => {
      calls.push(["save", p]);
      current = { ...current, revision: 2, rules: p.rules };
      return current;
    },
    preview: async (p) => {
      calls.push(["preview", p]);
      return { matching_accounts: 5, token: "fixture" };
    },
    check: async (p) => calls.push(["check", p]),
    records: async () => ({ lists: [], count: 0 }),
    detail: async () => ({}),
    ...overrides,
  };
  const components = new Proxy(
    {
      ElMessage: { success: (x) => messages.push(x) },
      ElMessageBox: { confirm: async () => {} },
      ElTable: vue.defineComponent({
        props: ["data"],
        setup(p, { slots }) {
          vue.provide("rows", () => p.data);
          return () => vue.h("table", slots.default?.());
        },
      }),
      ElTableColumn: vue.defineComponent({
        setup(p, { slots }) {
          const rows = vue.inject("rows");
          return () =>
            vue.h(
              "td",
              rows().flatMap(
                (row, i) => slots.default?.({ row, $index: i }) || [],
              ),
            );
        },
      }),
    },
    {
      get(o, k) {
        if (k in o) return o[k];
        return vue.defineComponent({
          props: ["modelValue", "disabled", "title"],
          emits: ["update:modelValue"],
          setup(p, { slots, attrs, emit }) {
            const input = ["ElInput", "ElInputNumber", "ElSwitch"].includes(k);
            return () =>
              vue.h(
                input ? "input" : k === "ElButton" ? "button" : "div",
                {
                  ...attrs,
                  disabled: p.disabled,
                  modelValue: p.modelValue,
                  onInput: (e) => emit("update:modelValue", e.target.value),
                },
                input
                  ? []
                  : [
                      p.title || "",
                      ...(slots.default?.() || []),
                      ...(slots.footer?.() || []),
                    ],
              );
          },
        });
      },
    },
  );
  const filename = path.join(__dirname, "PointAlertPanel.vue"),
    sfc = compileScript(
      parse(fs.readFileSync(filename, "utf8"), { filename }).descriptor,
      {
        id: "point-alert",
        inlineTemplate: true,
        templateOptions: { compilerOptions: { hoistStatic: false } },
      },
    );
  const code = ts.transpileModule(sfc.content, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText,
    m = { exports: {} };
  vm.runInNewContext(code, {
    module: m,
    exports: m.exports,
    console,
    require(id) {
      if (id === "vue") return vue;
      if (id === "element-plus") return components;
      if (id === "vue-router")
        return { onBeforeRouteLeave: (fn) => guards.push(fn) };
      if (id === "./rules.mjs") return require("./rules.mjs");
      throw Error(id);
    },
  });
  const root = n("root"),
    app = renderer.createApp(m.exports.default, {
      api,
      audience: "用户",
      canWrite: true,
      canCheck: true,
    });
  app.directive("loading", {});
  app.mount(root);
  await tick();
  return { root, calls, guards, messages, stop: () => app.unmount() };
}
test("failed rule fetch preserves explicit recovery and never offers a saveable blank configuration", async () => {
  const f = await fixture({
    rules: async () => {
      throw "加载失败";
    },
  });
  assert.ok(text(f.root).includes("加载失败"));
  assert.equal(button(f.root, "保存设置"), undefined);
  assert.equal(f.calls.length, 0);
  f.stop();
});
test("edited count is saved with current revision; checking requires a saved rule and confirmed preview", async () => {
  const f = await fixture();
  const counts = all(f.root).filter(
    (e) => e.type === "input" && e.props.modelValue === 3,
  );
  counts[0].props.onInput({ target: { value: 2 } });
  await tick();
  assert.equal(button(f.root, "检查当前余额").props.disabled, true);
  await button(f.root, "保存设置").props.onClick();
  await tick();
  assert.equal(f.calls[0][0], "save");
  assert.equal(f.calls[0][1].revision, 1);
  assert.equal(f.calls[0][1].rules.max_cycle, 2);
  assert.equal(
    f.calls.some((x) => x[0] === "check"),
    false,
  );
  f.stop();
});
test("manual check previews and requires explicit confirmation before queueing", async () => {
  const f = await fixture({
    rules: async () => ({
      revision: 1,
      unit: "点",
      sms_ready: false,
      rules: { ...rules(), enabled: true },
    }),
  });
  await button(f.root, "检查当前余额").props.onClick();
  await tick();
  assert.equal(f.calls.at(-1)[0], "preview");
  assert.equal(
    f.calls.some((x) => x[0] === "check"),
    false,
  );
  await button(f.root, "确认分批检查").props.onClick();
  await tick();
  assert.equal(
    JSON.stringify(f.calls.at(-1)),
    JSON.stringify(["check", { token: "fixture" }]),
  );
  f.stop();
});

test("failed enable preview shows feedback and keeps edited rule", async () => {
  const f = await fixture({
    preview: async () => {
      throw "预览服务暂时不可用";
    },
  });
  const enabled = all(f.root).find(
    (e) => e.type === "input" && e.props.modelValue === false,
  );
  enabled.props.onInput({ target: { value: true } });
  await tick();
  await button(f.root, "保存设置").props.onClick();
  await tick();
  assert.ok(text(f.root).includes("预览服务暂时不可用"));
  assert.equal(
    f.calls.some((x) => x[0] === "save"),
    false,
  );
  f.stop();
});
test("check rejection is visible inside preview dialog with a fresh preview action", async () => {
  const f = await fixture({
    rules: async () => ({
      revision: 1,
      unit: "点",
      rules: { ...rules(), enabled: true },
    }),
    check: async () => {
      throw "检查凭证已过期";
    },
  });
  await button(f.root, "检查当前余额").props.onClick();
  await tick();
  await button(f.root, "确认分批检查").props.onClick();
  await tick();
  const dialog = all(f.root).find((e) => e.props.title === "确认检查范围");
  // The dialog stub renders its title as content rather than forwarding it.
  const containing = all(f.root).find(
    (e) =>
      e.type === "div" && e.children.some((c) => c.text === "确认检查范围"),
  );
  assert.ok(containing && text(containing).includes("检查凭证已过期"));
  assert.ok(button(containing, "重新预览"));
  f.stop();
});
