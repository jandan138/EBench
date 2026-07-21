import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");

test("task-head-switcher registers and offers the four task-head modes", () => {
  const js = read("assets/js/widgets/task-head-switcher.js");
  assert.match(js, /EBWidgets\["task-head-switcher"\]/);
  ["gpt", "bert", "vlm", "vla"].forEach((mode) => {
    assert.match(js, new RegExp("\"" + mode + "\"|'" + mode + "'"), "missing mode " + mode);
  });
  assert.match(js, /EBW\.reduced/, "must respect prefers-reduced-motion");
});

test("peft-gradient registers and offers full / adapter / lora modes", () => {
  const js = read("assets/js/widgets/peft-gradient.js");
  assert.match(js, /EBWidgets\["peft-gradient"\]/);
  ["full", "adapter", "lora"].forEach((mode) => {
    assert.match(js, new RegExp("\"" + mode + "\"|'" + mode + "'"), "missing mode " + mode);
  });
  assert.match(js, /EBW\.reduced/, "must respect prefers-reduced-motion");
});
