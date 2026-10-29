import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeDocument,
  validateDocument,
  renameField,
  cloneNode,
} from "../document.mjs";
const doc = () => ({
  schema_version: 1,
  page: {
    nodes: [
      {
        id: "n",
        name: "cw-field",
        content: { field_id: "f" },
        styles: { base: { padding: 0, color: "transparent" } },
      },
    ],
  },
  fields: [{ id: "f", key: "topic", type: "text", label: "主题" }],
  prompt: { user_template: "主题 {{topic}}" },
  extensions: { future: 1 },
});
test("normalization preserves zero transparency extensions and is idempotent", () => {
  const d = normalizeDocument(doc());
  assert.deepEqual(normalizeDocument(d), d);
  assert.equal(d.page.nodes[0].styles.base.padding, 0);
  assert.equal(d.extensions.future, 1);
});
test("reject duplicate field aliases and unsupported schema", () => {
  const d = doc();
  d.fields.push({ id: "g", key: "topic", type: "text" });
  assert.ok(validateDocument(d).some((e) => e.code === "DUPLICATE_KEY"));
  d.schema_version = 7;
  assert.ok(validateDocument(d).some((e) => e.code === "SCHEMA_VERSION"));
});
test("rename updates actual variables without damaging content", () => {
  const d = renameField(doc(), "f", "subject");
  assert.equal(d.prompt.user_template, "主题 {{subject}}");
  assert.equal(d.fields[0].id, "f");
});
test("cloned visual node gets a fresh identity", () => {
  assert.notEqual(cloneNode(doc().page.nodes[0]).id, "n");
});
