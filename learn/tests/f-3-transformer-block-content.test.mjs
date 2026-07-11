import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const chapter = readFileSync(new URL("../chapters/foundations/f-3-transformer-block.html", import.meta.url), "utf8");
const contentSource = readFileSync(new URL("../content.js", import.meta.url), "utf8");
const ids = [...chapter.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
const requiredIds = [
  "attention-params", "mainline", "mlp", "shared-mlp", "mlp-expressivity",
  "residual-ln", "residual-gradient", "layernorm", "layernorm-axis",
  "layernorm-semantics", "full-flow", "block-trace", "variants",
  "deep-stack", "training-heads", "checkpoint", "recap",
];

test("F-3 has stable unique sections in teaching order", () => {
  assert.equal(new Set(ids).size, ids.length);
  requiredIds.forEach((id) => assert.ok(ids.includes(id), `missing #${id}`));
  const positions = requiredIds.map((id) => chapter.indexOf(`id="${id}"`));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test("F-3 maps every requested question to teaching content", () => {
  const answers = [...chapter.matchAll(/data-answers="([^"]+)"/g)]
    .flatMap((match) => match[1].split(","))
    .map(Number)
    .sort((a, b) => a - b);
  assert.deepEqual([...new Set(answers)], Array.from({ length: 15 }, (_, index) => index + 1));
});

test("F-3 states the mathematical and conceptual boundaries", () => {
  const compact = chapter.replace(/\s+/g, " ");
  [
    "Attention 负责通信", "MLP 负责", "Residual", "LayerNorm",
    "可以直接", "相同输入", "不同层", "不能保证", "非可逆",
    "不跨 batch", "不跨 token", "GPT", "BERT", "VLM", "VLA",
    "LN_1", "LN_2", "GELU", "gamma", "beta",
  ].forEach((marker) => assert.ok(compact.includes(marker), `missing boundary marker: ${marker}`));
});

test("F-3 metadata supports the expanded concepts", () => {
  const sandbox = { window: {} };
  vm.runInNewContext(contentSource, sandbox);
  const entry = sandbox.window.EBOOK.flat.find((section) => section.id === "f-3");
  assert.match(entry.title, /Transformer Block/);
  ["mlp", "gelu", "residual", "layernorm", "pre-norm", "gradient", "hidden state", "task head"]
    .forEach((keyword) => assert.ok(entry.keywords.toLowerCase().includes(keyword), `missing keyword: ${keyword}`));
});
