import { test } from "node:test";
import assert from "node:assert/strict";
import { toForm, toRules } from "./rules.mjs";
test("form preserves per-level channels, limits and interval through save", () => {
  const r = {
    thresholds: ["1000.00", "0.00"],
    channels: ["in_app"],
    level_channels: { "0.00": ["in_app", "sms"] },
    max_cycle: 3,
    max_daily: 2,
    min_interval_minutes: 60,
  };
  const f = toForm({ rules: r });
  const saved = toRules(f);
  assert.equal(saved.max_daily, 2);
  assert.deepEqual(saved.level_channels["0.00"], ["in_app", "sms"]);
  assert.equal(saved.min_interval_minutes, 60);
});
test("invalid decimal and duplicate levels cannot be saved", () => {
  assert.throws(() => toRules({ tiers: [{ points: "0.001", channels: [] }] }));
  assert.throws(() =>
    toRules({
      tiers: [
        { points: "1", channels: [] },
        { points: "1.00", channels: [] },
      ],
    }),
  );
});
