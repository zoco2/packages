import test from "node:test";
import assert from "node:assert/strict";
import { resolveNodeStyles, parseDeclarations } from "../styles.mjs";
test("explicit units use viewport and preserve zero and transparency", () => {
  for (const [w, v] of [
    [375, "12px"],
    [390, "12.48px"],
  ]) {
    const s = resolveNodeStyles(
      {
        styles: {
          base: {
            padding: { value: 24, unit: "rpx" },
            margin: 0,
            color: "transparent",
          },
        },
      },
      { viewportWidth: w, terminal: "h5" },
    );
    assert.equal(s.root.padding, v);
    assert.equal(s.root.margin, 0);
    assert.equal(s.root.color, "transparent");
  }
});
test("grid breakpoint and internal parts share state cascade", () => {
  const n = {
    styles: {
      base: { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))" },
      breakpoints: {
        mobile: { gridTemplateColumns: "repeat(2,minmax(0,1fr))" },
      },
      parts: {
        control: {
          base: { padding: { value: 16, unit: "px" } },
          states: { error: { borderColor: "red" } },
        },
      },
    },
  };
  const s = resolveNodeStyles(n, {
    viewportWidth: 390,
    terminal: "h5",
    states: ["error"],
  });
  assert.match(s.root.gridTemplateColumns, /repeat\(2/);
  assert.equal(s.control.padding, "16px");
  assert.equal(s.control.borderColor, "red");
});
test("declaration parser preserves CSS functions and rejects injection", () => {
  assert.equal(
    parseDeclarations(
      "grid-template-columns: repeat(3,minmax(0,1fr)); gap: 12px",
    ).gridTemplateColumns,
    "repeat(3,minmax(0,1fr))",
  );
  assert.throws(() => parseDeclarations("color:red;}body{display:none"));
  assert.throws(() =>
    parseDeclarations("background-image:url(javascript:alert(1))"),
  );
});
