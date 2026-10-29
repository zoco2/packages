export const clone = (value) => JSON.parse(JSON.stringify(value));
export function normalizeDocument(input = {}) {
  const d = clone(input);
  d.schema_version ??= 1;
  d.page ??= {};
  d.page.nodes ??= [];
  d.fields ??= [];
  d.prompt ??= { system_prompt: "", user_template: "" };
  d.result ??= { mode: "article" };
  d.model ??= { selection_mode: "user", allowed_model_ids: [] };
  d.publish_targets ??= ["pc", "h5", "mp-weixin"];
  d.extensions ??= {};
  return d;
}
export function walkNodes(nodes, visit) {
  for (const n of nodes || []) {
    visit(n);
    walkNodes(n.children, visit);
  }
}
export function validateDocument(input, targets = []) {
  const d = normalizeDocument(input),
    errors = [],
    ids = new Set(),
    keys = new Set();
  const error = (code, path) => errors.push({ code, path, message: code });
  if (d.schema_version !== 1) error("SCHEMA_VERSION", "schema_version");
  for (const f of d.fields) {
    if (!/^[a-z][a-z0-9_]{0,63}$/.test(f.key || "")) error("FIELD_KEY", f.id);
    if (keys.has(f.key)) error("DUPLICATE_KEY", f.id);
    if (ids.has(f.id)) error("DUPLICATE_ID", f.id);
    keys.add(f.key);
    ids.add(f.id);
  }
  const nodeIds = new Set();
  walkNodes(d.page.nodes, (n) => {
    if (!n.id || nodeIds.has(n.id)) error("NODE_ID", n.id);
    nodeIds.add(n.id);
    if (
      n.name === "cw-field" &&
      !d.fields.some((f) => f.id === n.content?.field_id)
    )
      error("FIELD_BINDING", n.id);
  });
  for (const m of (d.prompt.user_template || "").matchAll(
    /{{\s*([a-z][a-z0-9_]*)\s*}}/g,
  ))
    if (!keys.has(m[1])) error("UNKNOWN_VARIABLE", m[1]);
  for (const f of d.fields)
    if (f.show_if && !keys.has(f.show_if.key))
      error("CONDITION_REFERENCE", f.id);
  return errors;
}
export function renameField(input, id, key) {
  const d = normalizeDocument(input),
    f = d.fields.find((f) => f.id === id);
  if (!f) throw Error("字段不存在");
  if (
    !/^[a-z][a-z0-9_]{0,63}$/.test(key) ||
    d.fields.some((v) => v.id !== id && v.key === key)
  )
    throw Error("变量名称不合法或重复");
  const old = f.key;
  f.key = key;
  for (const dependent of d.fields)
    if (dependent.show_if?.key === old) dependent.show_if.key = key;
  for (const k of ["system_prompt", "user_template"])
    d.prompt[k] = (d.prompt[k] || "").replace(
      /{{\s*([a-z][a-z0-9_]*)\s*}}/g,
      (all, v) => (v === old ? `{{${key}}}` : all),
    );
  return d;
}
export const newId = () =>
  `cw_${globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2)}`;
export function cloneNode(node) {
  const n = clone(node);
  walkNodes([n], (v) => (v.id = newId()));
  return n;
}
export function visibleField(field, values) {
  const c = field.show_if;
  return !c || values[c.key] === c.equals;
}
