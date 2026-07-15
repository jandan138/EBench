import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const chapterPath = new URL("../chapters/foundations/f-2-25-multi-head-attention.html", import.meta.url);
const chapter = existsSync(chapterPath) ? readFileSync(chapterPath, "utf8") : "";
const contentSource = readFileSync(new URL("../content.js", import.meta.url), "utf8");
const f2 = readFileSync(new URL("../chapters/foundations/f-2-attention.html", import.meta.url), "utf8");
const f3 = readFileSync(new URL("../chapters/foundations/f-3-transformer-block.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../assets/css/book.css", import.meta.url), "utf8");
const ids = [...chapter.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
const requiredIds = [
  "start", "coordinate-system", "single-head", "parallel-heads", "concat",
  "output-projection", "shape-ledger", "gpu-view", "mask-boundary", "training",
  "checkpoint", "recap",
];
const section = (id) => chapter.match(
  new RegExp(`<h2[^>]*id="${id}"[^>]*>[\\s\\S]*?(?=<h2|</article>)`),
 )?.[0].replace(/\s+/g, " ") || "";

test("F-2.25 exists as a stable, ordered bridge from single-head Attention", () => {
  assert.ok(existsSync(chapterPath), "F-2.25 chapter file missing");
  assert.equal(new Set(ids).size, ids.length, "F-2.25 ids must be unique");
  requiredIds.forEach((id) => assert.ok(ids.includes(id), `missing #${id}`));
  const positions = requiredIds.map((id) => chapter.indexOf(`id="${id}"`));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, "F-2.25 teaching anchors are out of order");
});

test("F-2.25 defines head before using multi-head jargon", () => {
  const start = section("start");
  const coordinates = section("coordinate-system");
  assert.match(start, /一个 head/);
  ["不是 token", "不是位置", "不是 Transformer 层"].forEach((marker) => {
    assert.ok(coordinates.includes(marker), `#coordinate-system missing ${marker}`);
  });
  assert.ok(chapter.indexOf('id="coordinate-system"') < chapter.indexOf('id="parallel-heads"'));
});

test("F-2.25 traces one independent head before showing parallel heads", () => {
  const single = section("single-head");
  ["W_Q", "W_K", "W_V", "Q", "K", "V", "softmax", "Value"].forEach((marker) => {
    assert.ok(single.includes(marker), `#single-head missing ${marker}`);
  });
  const parallel = section("parallel-heads");
  ["独立", "随机", "不保证", "不同"].forEach((marker) => {
    assert.ok(parallel.includes(marker), `#parallel-heads missing ${marker}`);
  });
});

test("F-2.25 makes concat and W_O mathematically and conceptually explicit", () => {
  const concat = section("concat");
  ["最后一个 feature", "不是拼 token", "不是平均"].forEach((marker) => {
    assert.ok(concat.includes(marker), `#concat missing ${marker}`);
  });
  const output = section("output-projection");
  ["W_O", "线性", "不是", "reshape", "d_{model}"].forEach((marker) => {
    assert.ok(output.includes(marker), `#output-projection missing ${marker}`);
  });
});

test("F-2.25 keeps a single, complete tensor-shape and GPU view", () => {
  const ledger = section("shape-ledger");
  ["B,n,d_{model}", "B,h,n,d_{head}", "B,h,n,n", "h d_{head}", "d_{model}"].forEach((marker) => {
    assert.ok(ledger.includes(marker), `#shape-ledger missing ${marker}`);
  });
  const gpu = section("gpu-view");
  ["GPU", "大矩阵", "reshape", "transpose", "不是"].forEach((marker) => {
    assert.ok(gpu.includes(marker), `#gpu-view missing ${marker}`);
  });
});

test("F-2.25 places mask and training boundaries in their owning sections", () => {
  const mask = section("mask-boundary");
  ["softmax 前", "每个 head", "key", "0"].forEach((marker) => {
    assert.ok(mask.includes(marker), `#mask-boundary missing ${marker}`);
  });
  const training = section("training");
  ["Loss", "反向传播", "没有", "不保证"].forEach((marker) => {
    assert.ok(training.includes(marker), `#training missing ${marker}`);
  });
});

test("F-2.25 exposes a static visual ledger with narrow-screen rules", () => {
  ["mha-coordinate-grid", "mha-parallel-flow", "mha-head-grid", "mha-shape-ledger", "mha-gpu-code"].forEach((className) => {
    assert.match(chapter, new RegExp(`class="[^"]*${className}`), `missing .${className}`);
  });
  const mobile = css.match(/@media \(max-width: 560px\) \{([\s\S]*?)\n\}/)?.[1] || "";
  ["mha-coordinate-grid", "mha-parallel-flow", "mha-head-grid"].forEach((className) => {
    assert.match(mobile, new RegExp(`\\.${className}\\s*\\{[^}]*grid-template-columns:\\s*minmax\\(0,\\s*1fr\\)`), `${className} must stack on mobile`);
  });
});

test("F-2.25 is registered and closes the prerequisite links without skipping it", () => {
  const sandbox = { window: {} };
  vm.runInNewContext(contentSource, sandbox);
  const flat = sandbox.window.EBOOK.flat;
  const entry = flat.find((item) => item.id === "f-2-25");
  assert.ok(entry, "F-2.25 navigation entry missing");
  assert.equal(entry.file, "chapters/foundations/f-2-25-multi-head-attention.html");
  ["multi-head", "head", "w_o", "concat", "gpu"].forEach((keyword) => {
    assert.ok(entry.keywords.toLowerCase().includes(keyword), `missing F-2.25 keyword: ${keyword}`);
  });
  assert.match(f2, /href="f-2-25-multi-head-attention\.html#start"/);
  assert.match(f2, /href="f-2-25-multi-head-attention\.html#output-projection"/);
  assert.match(chapter, /href="f-2-5-linear-gelu-mlp\.html#start"/);
  assert.match(f3, /href="f-2-25-multi-head-attention\.html#output-projection"/);
});

test("F-2.25 ends with checkable corrections, then hands off to MLP", () => {
  const checkpoint = section("checkpoint");
  ["head", "token", "softmax", "concat", "W_O"].forEach((marker) => {
    assert.ok(checkpoint.includes(marker), `#checkpoint missing ${marker}`);
  });
  const recap = section("recap");
  ["F-2.5", "MLP", "F-3"].forEach((marker) => assert.ok(recap.includes(marker), `#recap missing ${marker}`));
});
