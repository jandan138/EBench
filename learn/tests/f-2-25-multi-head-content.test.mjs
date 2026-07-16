import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const chapterPath = new URL("../chapters/foundations/f-2-25-multi-head-attention.html", import.meta.url);
const chapter = existsSync(chapterPath) ? readFileSync(chapterPath, "utf8") : "";
const contentSource = readFileSync(new URL("../content.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../assets/css/book.css", import.meta.url), "utf8");
const ids = [...chapter.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
const requiredIds = [
  "start", "coordinate-system", "single-head", "parallel-heads", "concat",
  "output-projection", "core-summary", "implementation-deep-dive",
  "shape-ledger", "gpu-view", "mask-boundary", "training", "mqa-gqa",
  "checkpoint", "recap",
];
const section = (id) => chapter.match(
  new RegExp("<h[23][^>]*id=\"" + id + "\"[^>]*>[\\s\\S]*?(?=<h[23]|</article>)"),
)?.[0].replace(/\s+/g, " ") || "";
const assertInOrder = (idsToCheck) => {
  const positions = idsToCheck.map((id) => chapter.indexOf("id=\"" + id + "\""));
  assert.deepEqual([...positions].sort((left, right) => left - right), positions);
};

test("F-2.25 keeps the single-head story contiguous before implementation depth", () => {
  assert.ok(existsSync(chapterPath), "F-2.25 chapter file missing");
  assert.equal(new Set(ids).size, ids.length, "F-2.25 ids must be unique");
  requiredIds.forEach((id) => assert.ok(ids.includes(id), "missing #" + id));
  assertInOrder(requiredIds);
  assertInOrder(["start", "coordinate-system", "single-head", "parallel-heads", "concat", "output-projection", "core-summary"]);
  assertInOrder(["implementation-deep-dive", "shape-ledger", "gpu-view", "mask-boundary", "training", "mqa-gqa"]);
});

test("F-2.25 defines head, shape symbols, and W_O before relying on their implementation details", () => {
  const start = section("start");
  ["B", "n", "d_model", "d_head"].forEach((marker) => assert.ok(start.includes(marker), "#start missing " + marker));
  const coordinates = section("coordinate-system");
  ["不是 token", "不是位置", "不是 Transformer 层"].forEach((marker) => {
    assert.ok(coordinates.includes(marker), "#coordinate-system missing " + marker);
  });
  const output = section("output-projection");
  ["W_O", "普通 Linear", "Y=CW_O+b_O", "加权组合", "bias", "不是另一次 Attention"].forEach((marker) => {
    assert.ok(output.includes(marker), "#output-projection missing " + marker);
  });
});

test("F-2.25 preserves the mathematical and implementation boundaries", () => {
  const single = section("single-head");
  ["W_Q", "W_K", "W_V", "Q", "K", "V", "softmax", "Value"].forEach((marker) => {
    assert.ok(single.includes(marker), "#single-head missing " + marker);
  });
  const parallel = section("parallel-heads");
  ["随机", "不保证", "不同"].forEach((marker) => {
    assert.ok(parallel.includes(marker), "#parallel-heads missing " + marker);
  });
  const concat = section("concat");
  ["最后一个 feature", "不是拼 token", "不是平均"].forEach((marker) => {
    assert.ok(concat.includes(marker), "#concat missing " + marker);
  });
  const deepDive = section("implementation-deep-dive");
  assert.match(deepDive, /可见的进阶补充/);
  const ledger = section("shape-ledger");
  ["B,n,d_{model}", "B,h,n,d_{head}", "B,h,n,n", "h d_{head}", "d_{model}"].forEach((marker) => {
    assert.ok(ledger.includes(marker), "#shape-ledger missing " + marker);
  });
  const gpu = section("gpu-view");
  ["GPU", "大矩阵", "reshape", "transpose", "不是"].forEach((marker) => {
    assert.ok(gpu.includes(marker), "#gpu-view missing " + marker);
  });
  const mask = section("mask-boundary");
  ["softmax 前", "每个 head", "key", "全遮住"].forEach((marker) => {
    assert.ok(mask.includes(marker), "#mask-boundary missing " + marker);
  });
  const training = section("training");
  ["Loss", "反向传播", "没有", "不保证"].forEach((marker) => {
    assert.ok(training.includes(marker), "#training missing " + marker);
  });
  const mqa = section("mqa-gqa");
  ["MQA", "GQA", "K/V", "KV cache"].forEach((marker) => assert.ok(mqa.includes(marker), "#mqa-gqa missing " + marker));
});

test("F-2.25 retains readable visual contracts on narrow screens", () => {
  ["mha-coordinate-grid", "mha-parallel-flow", "mha-head-grid", "mha-shape-ledger", "mha-gpu-code"].forEach((className) => {
    assert.match(chapter, new RegExp("class=\"[^\"]*" + className), "missing ." + className);
  });
  const mobile = css.match(/@media \(max-width: 560px\) \{([\s\S]*?)\n\}/)?.[1] || "";
  ["mha-coordinate-grid", "mha-parallel-flow", "mha-head-grid"].forEach((className) => {
    assert.match(mobile, new RegExp("\\." + className + "\\s*\\{[^}]*grid-template-columns:\\s*minmax\\(0,\\s*1fr\\)"), className + " must stack on mobile");
  });
});

test("F-2.25 is registered, checkable, and hands off through the new sequence", () => {
  const sandbox = { window: {} };
  vm.runInNewContext(contentSource, sandbox);
  const entry = sandbox.window.EBOOK.flat.find((item) => item.id === "f-2-25");
  assert.ok(entry, "F-2.25 navigation entry missing");
  assert.equal(entry.file, "chapters/foundations/f-2-25-multi-head-attention.html");
  ["multi-head", "head", "w_o", "concat", "gpu"].forEach((keyword) => {
    assert.ok(entry.keywords.toLowerCase().includes(keyword), "missing F-2.25 keyword: " + keyword);
  });
  const checkpoint = section("checkpoint");
  ["head", "token", "softmax", "concat", "W<sub>O</sub>"].forEach((marker) => {
    assert.ok(checkpoint.includes(marker), "#checkpoint missing " + marker);
  });
  const recap = section("recap");
  ["F-2.5", "F-2.6", "F-3", "MLP"].forEach((marker) => assert.ok(recap.includes(marker), "#recap missing " + marker));
});
