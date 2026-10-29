import test from "node:test";
import assert from "node:assert/strict";
import { createDesignerState } from "../designer-state.mjs";
import {
  mergeTaskSnapshot,
  parseResult,
  buildRegenerateRequest,
  copyResultText,
  buildCategoryView,
  createSseParser,
  copywritingIconUrl,
} from "../client.mjs";
test("bundled icons use the active site while tenant custom images keep their host", () => {
  assert.equal(copywritingIconUrl("http://old-site/resource/image/copywriting/copy_rewrite.png", "http://localhost:3033"), "http://localhost:3033/resource/image/copywriting/copy_rewrite.png");
  assert.equal(copywritingIconUrl("https://cdn.example/uploads/custom.png", "http://localhost:3033"), "https://cdn.example/uploads/custom.png");
  assert.equal(copywritingIconUrl("", "http://localhost:3033"), "");
});
test("designer edits grid and internal part with undo and redo", () => {
  const s = createDesignerState({
    page: {
      nodes: [
        {
          id: "grid",
          name: "cw-container",
          styles: { base: { display: "grid" } },
        },
      ],
    },
  });
  s.applyCommand({
    type: "setStyle",
    id: "grid",
    part: "control",
    layer: "base",
    property: "padding",
    value: { value: 12, unit: "px" },
  });
  assert.equal(
    s.serialize().page.nodes[0].styles.parts.control.base.padding.value,
    12,
  );
  s.undo();
  assert.equal(s.serialize().page.nodes[0].styles.parts, undefined);
  s.redo();
  assert.equal(
    s.serialize().page.nodes[0].styles.parts.control.base.padding.value,
    12,
  );
});
test("task snapshots never regress text or terminal status", () => {
  const old = {
    id: 1,
    last_seq: 4,
    result_text: "完整正文",
    status: "success",
  };
  assert.deepEqual(
    mergeTaskSnapshot(old, {
      id: 1,
      last_seq: 2,
      result_text: "完整",
      status: "running",
    }),
    old,
  );
});
test("regenerate pins original inputs but uses currently chosen model and new key", () => {
  const r = buildRegenerateRequest(
    { id: 7, tool_id: 2, version_id: 3, values: { topic: "原主题" } },
    "model2",
    "new-request-key-123",
  );
  assert.equal(r.model_selection, "model2");
  assert.equal(r.values.topic, "原主题");
  assert.equal(r.source_task_id, 7);
  assert.equal(r.idempotency_key, "new-request-key-123");
});
test("copy reports actual clipboard failure and does not alter text", async () => {
  await assert.rejects(() =>
    copyResultText({ raw: "原文" }, "all", async () => {
      throw Error("denied");
    }),
  );
  let v = "";
  await copyResultText({ raw: "原文" }, "all", async (text) => (v = text));
  assert.equal(v, "原文");
});
test("partial variants remain visible and complete numbered candidates are parsed", () => {
  assert.equal(parseResult("正在生成", "variants").raw, "正在生成");
  assert.equal(
    parseResult("1. 标题甲\n2. 标题乙", "variants").sections.length,
    2,
  );
});
test("category filter respects visibility and independent ordering", () => {
  const c = [
    { id: 1, code: "a", name: "A", sort: 1, is_visible: 1 },
    { id: 2, code: "b", name: "B", sort: 2, is_visible: 0 },
  ];
  const out = buildCategoryView(
    c,
    [
      { id: 1, category_id: 1, name: "工具", sort: 1 },
      { id: 2, category_id: 2, name: "隐藏工具" },
    ],
    "",
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].tools[0].id, 1);
});
test("SSE split frames are buffered across arbitrary UTF8 decoded chunks", () => {
  const out = [];
  const parse = createSseParser((v) => out.push(v));
  parse('event: snapshot\r\ndata: {"result_text":"你');
  assert.equal(out.length, 0);
  parse('好"}\r\n\r\n');
  assert.equal(out[0].result_text, "你好");
});

test("definitive rejection is distinguishable from an uncertain transport failure", async () => {
  const { unwrapSubmission } = await import("../client.mjs");
  assert.throws(
    () => unwrapSubmission({ code: 0, msg: "内容不能为空" }),
    (e) => e.submissionRejected === true,
  );
  assert.deepEqual(unwrapSubmission({ code: 1, data: { id: 1 } }), { id: 1 });
});
test("field rename preserves conditional dependencies and dangling references fail validation", async () => {
  const { renameField, validateDocument } = await import("../document.mjs");
  const input = {
    fields: [
      { id: "mode", key: "length", type: "radio", options: [] },
      {
        id: "words",
        key: "words",
        type: "number",
        show_if: { key: "length", equals: "custom" },
      },
    ],
    page: { nodes: [] },
    prompt: {},
  };
  const d = renameField(input, "mode", "article_length");
  assert.equal(d.fields[1].show_if.key, "article_length");
  d.fields[1].show_if.key = "missing";
  assert.ok(validateDocument(d).some((e) => e.code === "CONDITION_REFERENCE"));
});

test("runtime loading disabled and error styles receive real interaction states", async () => {
  const { nodeInteractionStates } = await import("../client.mjs");
  assert.deepEqual(nodeInteractionStates("cw-submit", { busy: true }), [
    "loading",
    "disabled",
  ]);
  assert.deepEqual(nodeInteractionStates("cw-result", { error: true }), [
    "error",
  ]);
  assert.deepEqual(nodeInteractionStates("cw-submit", { hasModel: false }), [
    "disabled",
  ]);
});
