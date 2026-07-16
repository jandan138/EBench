import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const chapter = readFileSync(new URL("../chapters/foundations/f-3-transformer-block.html", import.meta.url), "utf8");
const contentSource = readFileSync(new URL("../content.js", import.meta.url), "utf8");
const ids = [...chapter.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
const requiredIds = [
  "block-scene", "mainline", "full-flow", "block-trace", "attention-params", "mlp",
  "residual-ln", "residual-gradient", "layernorm", "layernorm-axis", "layernorm-semantics",
  "variants", "deep-stack", "training-heads", "checkpoint", "recap",
];
const section = (id) => chapter.match(
  new RegExp("<h2[^>]*id=\"" + id + "\"[^>]*>[\\s\\S]*?(?=<h2|</article>)"),
)?.[0].replace(/\s+/g, " ") || "";
const assertInOrder = (idsToCheck) => {
  const positions = idsToCheck.map((id) => chapter.indexOf("id=\"" + id + "\""));
  positions.forEach((position, index) => assert.ok(position >= 0, "missing #" + idsToCheck[index]));
  assert.deepEqual([...positions].sort((left, right) => left - right), positions, "F-3 teaching order regressed");
};

test("F-3 starts with one complete Block trip before its module deep dives", () => {
  assert.equal(new Set(ids).size, ids.length);
  requiredIds.forEach((id) => assert.ok(ids.includes(id), "missing #" + id));
  assertInOrder(requiredIds);
  assertInOrder(["block-scene", "mainline", "full-flow", "block-trace", "attention-params", "mlp"]);
  const opening = section("block-scene") + section("mainline") + section("full-flow");
  ["[B,n,d]", "整个序列", "逐位置", "逐元素相加", "LN_1", "LN_2", "A^\\ell"].forEach((marker) => {
    assert.ok(opening.includes(marker), "F-3 opening missing " + marker);
  });
  assert.match(section("full-flow"), /pre-norm/);
  assert.match(section("full-flow"), /W<sub>O<\/sub>/);
});

test("F-3 retains prerequisite bridges and old MLP fragment anchors", () => {
  ["shared-mlp", "mlp-expressivity"].forEach((id) => {
    assert.match(chapter, new RegExp("<a id=\"" + id + "\"[^>]*aria-hidden=\"true\""), "missing compatibility #" + id);
  });
  const firstAlias = chapter.indexOf('id="shared-mlp"');
  const secondAlias = chapter.indexOf('id="mlp-expressivity"');
  const mlpHeading = chapter.indexOf('<h2 id="mlp"');
  assert.ok(firstAlias < secondAlias && secondAlias < mlpHeading);
  assert.match(section("attention-params"), /f-2-25-multi-head-attention\.html#output-projection/);
  const mlp = section("mlp");
  ["f-2-5-linear-gelu-mlp.html#mlp-trace", "Linear 1", "GELU", "Linear 2", "d<sub>ff</sub>", "F-2.6"].forEach((marker) => {
    assert.ok(mlp.includes(marker), "#mlp missing " + marker);
  });
  assert.match(section("recap"), /f-2-6-activation-gates\.html#preactivation/);
});

test("F-3 gives residual and LayerNorm their own careful boundaries", () => {
  const residual = section("residual-ln");
  ["y=x+F(x)", "x ───────────────┐", "identity", "不能保证"].forEach((marker) => {
    assert.ok(residual.includes(marker), "#residual-ln missing " + marker);
  });
  const gradient = section("residual-gradient");
  ["optional", "I+J_F", "不能保证"].forEach((marker) => assert.ok(gradient.includes(marker), "#residual-gradient missing " + marker));
  const norm = section("layernorm");
  ["\\gamma", "\\beta", "\\mu", "\\sigma", "不跨 token"].forEach((marker) => {
    assert.ok((norm + section("layernorm-axis")).includes(marker), "LayerNorm explanation missing " + marker);
  });
  ["不跨 batch", "不跨 token", "X[b,i,:]"].forEach((marker) => {
    assert.ok(section("layernorm-axis").includes(marker), "#layernorm-axis missing " + marker);
  });
  ["非可逆", "gamma", "beta"].forEach((marker) => {
    assert.ok(section("layernorm-semantics").includes(marker), "#layernorm-semantics missing " + marker);
  });
});

test("F-3 maps all requested questions and exposes task-head scope", () => {
  const answers = [...chapter.matchAll(/data-answers="([^"]+)"/g)]
    .flatMap((match) => match[1].split(","))
    .map(Number)
    .sort((left, right) => left - right);
  assert.deepEqual([...new Set(answers)], Array.from({ length: 15 }, (_, index) => index + 1));
  ["GPT", "BERT", "VLM", "VLA"].forEach((marker) => {
    assert.ok(section("training-heads").includes(marker), "#training-heads missing " + marker);
  });
  ["Attention 负责通信", "MLP 负责逐位置计算", "Residual", "LayerNorm"].forEach((marker) => {
    assert.ok(section("recap").includes(marker), "#recap missing " + marker);
  });
});

test("F-3 metadata and widget contracts remain available", () => {
  const sandbox = { window: {} };
  vm.runInNewContext(contentSource, sandbox);
  const entry = sandbox.window.EBOOK.flat.find((sectionEntry) => sectionEntry.id === "f-3");
  assert.match(entry.title, /Transformer Block/);
  ["mlp", "gelu", "residual", "layernorm", "pre-norm", "gradient", "hidden state", "task head"]
    .forEach((keyword) => assert.ok(entry.keywords.toLowerCase().includes(keyword), "missing keyword: " + keyword));

  const widgetPath = new URL("../assets/js/widgets/transformer-block-viz.js", import.meta.url);
  const cssPath = new URL("../assets/css/book.css", import.meta.url);
  assert.ok(existsSync(widgetPath), "widget file missing");
  const widget = readFileSync(widgetPath, "utf8");
  const css = readFileSync(cssPath, "utf8");
  assert.match(chapter, /data-widget="transformer-block-viz"/);
  assert.ok(chapter.indexOf("transformer-block-viz.js") < chapter.indexOf("book.js"));
  ["block", "mlp", "residual", "norm"].forEach((view) => {
    assert.match(widget, new RegExp("data-view: \"" + view + "\""), "widget view missing: " + view);
  });
  assert.match(widget, /aria-pressed/);
  assert.match(widget, /aria-live/);
  assert.match(css, /\.transformer-block-viz/);
});

test("F-3 keeps the block trace and static tables readable on mobile", () => {
  const css = readFileSync(new URL("../assets/css/book.css", import.meta.url), "utf8");
  const mobile = css.match(/@media \(max-width: 560px\) \{([\s\S]*?)\n\}/)?.[1] || "";
  ["tbv-stages", "tbv-mlp-row"].forEach((className) => {
    assert.match(mobile, new RegExp("\\." + className + "\\s*\\{[^}]*grid-template-columns:\\s*minmax\\(0,\\s*1fr\\)"), className + " must use one mobile column");
  });
  assert.match(chapter, /class="f3-role-grid"/);
  assert.match(mobile, /body\[data-section="f-3"\]\s+\.article\s+\.f3-role-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(mobile, /body\[data-section="f-3"\]\s+\.article\s+table\.f3-mobile-stack/);
  ["variants", "training-heads"].forEach((id) => {
    const table = section(id).match(/<table[^>]*>[\s\S]*?<\/table>/)?.[0] || "";
    assert.match(table, /<table class="f3-mobile-stack">/);
    assert.match(table, /data-label=/);
  });
});
