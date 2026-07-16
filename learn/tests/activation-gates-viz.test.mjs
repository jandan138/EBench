import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const chapterPath = new URL("../chapters/foundations/f-2-6-activation-gates.html", import.meta.url);
const chapter = existsSync(chapterPath) ? readFileSync(chapterPath, "utf8") : "";
const core = readFileSync(new URL("../assets/js/widgets/mlp-basics-core.js", import.meta.url), "utf8");
const widget = readFileSync(new URL("../assets/js/widgets/activation-gates-viz.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../assets/css/book.css", import.meta.url), "utf8");
const workflow = readFileSync(new URL("../../.github/workflows/deploy-learning-site.yml", import.meta.url), "utf8");
const section = (id) => chapter.match(
  new RegExp("<h2[^>]*id=\"" + id + "\"[^>]*>[\\s\\S]*?(?=<h2|</article>)"),
)?.[0].replace(/\s+/g, " ") || "";

test("activation-gates widget belongs to F-2.6 and registers after the shared core", () => {
  assert.match(chapter, /data-widget="activation-gates-viz"/);
  assert.ok(chapter.indexOf("mlp-basics-core.js") < chapter.indexOf("activation-gates-viz.js"));
  assert.ok(chapter.indexOf("activation-gates-viz.js") < chapter.indexOf("book.js"));
  assert.match(core, /window\.EBMLPBasics/);
  assert.match(widget, /EBWidgets\["activation-gates-viz"\]/);
  ["channels", "threshold", "pair", "training"].forEach((view) => {
    assert.match(widget, new RegExp("data-view: \"" + view + "\""), "widget view missing: " + view);
  });
});

test("F-2.6 keeps the static teaching source next to each gate conclusion", () => {
  const preactivation = section("preactivation");
  ["CHANNEL_INPUT", "CHANNEL_W", "CHANNEL_B", "z_1=1(1)+1(1.1)+0=2.1"].forEach((marker) => {
    assert.ok(preactivation.includes(marker), "#preactivation missing " + marker);
  });
  const threshold = section("bias-threshold");
  ["ReLU(x-3)", ">2<", ">3<", ">4<"].forEach((marker) => {
    assert.ok(threshold.includes(marker), "#bias-threshold missing " + marker);
  });
  const negative = section("negative-information");
  ["ReLU(z)-ReLU(-z)=z", "GELU(-1)", "0.318"].forEach((marker) => {
    assert.ok(negative.includes(marker), "#negative-information missing " + marker);
  });
  const training = section("training-gates");
  ["data-training-trace=\"relevant\"", "data-training-trace=\"irrelevant\"", "w_new=w-η", "optional"].forEach((marker) => {
    assert.ok(training.includes(marker), "#training-gates missing " + marker);
  });
});

test("F-2.6 owns the static GELU and mobile table rules without leaking F-2.5 selectors", () => {
  ["f26-gelu-static", "f26-gelu-values", "f26-gelu-figure", "f26-mobile-stack", "f26-object-grid"].forEach((className) => {
    assert.match(chapter, new RegExp("class=\"[^\"]*" + className), "chapter missing ." + className);
    assert.match(css, new RegExp("body\\[data-section=\"f-2-6\"\\][\\s\\S]*\\." + className), "CSS missing F-2.6 scope for ." + className);
  });
  const mobile = css.match(/@media \(max-width: 560px\) \{([\s\S]*?)\n\}/)?.[1] || "";
  ["f26-gelu-static", "f26-mobile-stack"].forEach((className) => {
    assert.match(mobile, new RegExp("body\\[data-section=\"f-2-6\"\\][\\s\\S]*\\." + className), "mobile CSS missing ." + className);
  });
  assert.match(css, /\.activation-gates-viz \.agv-view-controls/);
});

test("F-2.6 recap points into the full Block and keeps LayerNorm discoverable", () => {
  const recap = section("recap");
  assert.match(recap, /<a href="f-3-transformer-block\.html#full-flow">[^<]*F-3[^<]*完整 Block[^<]*<\/a>/);
  assert.match(recap, /<a href="f-3-transformer-block\.html#layernorm">[^<]*F-3[^<]*LayerNorm[^<]*<\/a>/);
});

test("Pages deployment verifies the migrated foundations contracts without a browser install", () => {
  ["activation-gates-viz.test.mjs", "foundations-navigation-integrity.test.mjs", "f-2-25-multi-head-content.test.mjs", "f-2-5-mlp-basics-content.test.mjs", "f-2-5-mlp-basics-math.test.mjs", "f-2-6-activation-content.test.mjs", "f-3-transformer-block-content.test.mjs", "foundations-story-arc.test.mjs"].forEach((testFile) => {
    assert.ok(workflow.includes(testFile), "workflow does not verify " + testFile);
  });
  assert.match(workflow, /node --check learn\/assets\/js\/widgets\/activation-gates-viz\.js/);
  assert.doesNotMatch(workflow, /playwright install/);
});
