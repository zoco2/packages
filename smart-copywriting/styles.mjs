import catalog from "./generated/catalog.mjs";
const allowed = new Set(catalog.style_properties),
  statesOrder = ["hover", "focus", "selected", "loading", "disabled", "error"];
const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
export function validateStyleValue(key, value) {
  if (!allowed.has(key) && !/^--cw-[a-z0-9-]+$/.test(key))
    throw Error(`不支持的样式属性：${key}`);
  if (value === null) return;
  const text =
    typeof value === "object"
      ? String(value.value) + String(value.unit)
      : String(value);
  if (
    /[{};<>\\]|@import|expression\s*\(|javascript\s*:|data\s*:|\/\*/i.test(text)
  )
    throw Error(`样式值不合法：${key}`);
  let depth = 0;
  for (const c of text) {
    if (c === "(") depth++;
    if (c === ")" && --depth < 0) throw Error("样式括号不完整");
  }
  if (depth !== 0) throw Error("样式括号不完整");
  if (
    typeof value === "object" &&
    (!Number.isFinite(Number(value.value)) ||
      !["px", "rpx", "%", "rem", "em", "vw", "vh", "fr"].includes(value.unit))
  )
    throw Error("尺寸或单位不合法");
}
export function parseDeclarations(text) {
  const result = {};
  for (const line of text.split(";")) {
    if (!line.trim()) continue;
    const i = line.indexOf(":");
    if (i < 1) throw Error("请使用 属性: 值 格式");
    const k = camel(line.slice(0, i).trim()),
      v = line.slice(i + 1).trim();
    validateStyleValue(k, v);
    result[k] = v;
  }
  return result;
}
function cssValue(v, context) {
  if (v && typeof v === "object" && "unit" in v) {
    if (v.unit === "rpx")
      return context.terminal === "mp-weixin"
        ? `${v.value}rpx`
        : `${Number(((v.value * (context.viewportWidth || 375)) / 750).toFixed(5))}px`;
    return `${v.value}${v.unit}`;
  }
  return v;
}
function merged(style, context) {
  const { viewportWidth = 375, terminal = "h5", states = [] } = context;
  let r = { ...(style?.base || {}) };
  const bp =
    viewportWidth < 768
      ? "mobile"
      : viewportWidth < 1200
        ? "tablet"
        : "desktop";
  Object.assign(
    r,
    style?.breakpoints?.[terminal === "mp-weixin" ? "mobile" : bp],
    style?.terminals?.[terminal],
  );
  for (const state of statesOrder)
    if (states.includes(state)) Object.assign(r, style?.states?.[state]);
  return Object.fromEntries(
    Object.entries(r)
      .filter(([k, v]) => v !== null)
      .map(([k, v]) => {
        validateStyleValue(k, v);
        return [k, cssValue(v, context)];
      }),
  );
}
export function resolveNodeStyles(node, context = {}) {
  const s = node.styles || {};
  const out = { root: merged(s, context) };
  for (const [part, value] of Object.entries(s.parts || {}))
    out[part] = merged(value, context);
  return out;
}
export function compileDocumentStyles(document, context = {}) {
  const rules = {},
    diagnostics = [];
  const walk = (nodes) => {
    for (const n of nodes || []) {
      try {
        rules[n.id] = resolveNodeStyles(n, context);
      } catch (e) {
        diagnostics.push({ node_id: n.id, message: e.message });
      }
      walk(n.children);
    }
  };
  walk(document.page?.nodes);
  return { rules, diagnostics };
}
