import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const chapterPath = new URL("../chapters/foundations/f-2-5-linear-gelu-mlp.html", import.meta.url);
const widgetPath = new URL("../assets/js/widgets/activation-gates-viz.js", import.meta.url);
const cssPath = new URL("../assets/css/book.css", import.meta.url);
const workflowPath = new URL("../../.github/workflows/deploy-learning-site.yml", import.meta.url);
const chapter = readFileSync(chapterPath, "utf8");
const widget = existsSync(widgetPath) ? readFileSync(widgetPath, "utf8") : "";
const css = readFileSync(cssPath, "utf8");
const workflow = readFileSync(workflowPath, "utf8");

test("activation-gates widget registers after the shared core and before book", () => {
  assert.ok(existsSync(widgetPath), "missing activation-gates-viz.js");
  assert.match(chapter, /data-widget="activation-gates-viz"/);
  assert.ok(chapter.indexOf("mlp-basics-core.js") < chapter.indexOf("activation-gates-viz.js"));
  assert.ok(chapter.indexOf("activation-gates-viz.js") < chapter.indexOf("book.js"));
  assert.match(widget, /EBWidgets\["activation-gates-viz"\]/);
  ["channels", "threshold", "pair", "training"].forEach((view) => {
    assert.ok(widget.includes(`data-view: "${view}"`), `missing ${view} view`);
  });
  assert.match(widget, /aria-pressed/);
  assert.match(widget, /aria-live/);
  assert.match(widget, /keydown/);
  assert.match(css, /\.activation-gates-viz/);
});

test("activation-gates conclusions have section-owned static source content", () => {
  const labStart = chapter.indexOf('data-widget="activation-gates-viz"');
  const labEnd = chapter.indexOf('<h2 id="why-nonlinearity"');
  const lab = labStart >= 0 && labEnd > labStart ? chapter.slice(labStart, labEnd) : "";
  assert.ok(lab, "activation gate lab missing");
  ["2.100", "-0.700", "1.300", "-3.200"]
    .forEach((marker) => assert.ok(lab.includes(marker), `static lab missing ${marker}`));
  assert.equal((lab.match(/agv-channel-table/g) || []).length, 1);
  assert.doesNotMatch(lab, /ReLU\(x-3\)|agv-pair-reconstruction|data-training-trace=/);

  const threshold = chapter.match(/<h2[^>]*id="bias-threshold"[^>]*>[\s\S]*?(?=<h2|<\/article>)/)?.[0] || "";
  assert.match(threshold, /ReLU\(x-3\)/);
  assert.match(threshold, /w=0/);
  assert.match(threshold, /负 w/);
  const negative = chapter.match(/<h2[^>]*id="negative-information"[^>]*>[\s\S]*?(?=<h2|<\/article>)/)?.[0] || "";
  assert.match(negative, /ReLU\(z\)-ReLU\(-z\)=z；z=-2\.500 时为 0\.000-2\.500=-2\.500/);
  assert.match(negative, /不是说每个模型都会这样配对/);
  const training = chapter.match(/<h2[^>]*id="training-gates"[^>]*>[\s\S]*?(?=<h2|<\/article>)/)?.[0] || "";
  assert.equal((training.match(/data-training-trace="(?:relevant|irrelevant)"/g) || []).length, 2);
  assert.equal((training.match(/<tr>/g) || []).length, 12, "two headers plus ten complete static trace rows");
  assert.ok(chapter.indexOf('id="negative-information"') < chapter.indexOf('data-widget="activation-gates-viz"'));
  assert.ok(chapter.indexOf('data-widget="activation-gates-viz"') < chapter.indexOf('id="why-nonlinearity"'));
  assert.match(chapter, /一条向量怎样穿过 MLP[\s\S]*既有 MLP trace/);
  assert.match(lab, /四个视图复用纯计算.*不为通道指定固定的人类语义/);
});

test("activation-gates CSS is fully widget scoped while static F-2.5 rules stay section scoped", () => {
  for (const rule of css.matchAll(/([^{}]+)\{/g)) {
    const selector = rule[1].trim();
    if (selector.includes(".f25-")) assert.match(selector, /body\[data-section="f-2-5"\] \.article/);
    if (selector.includes(".agv-")) {
      selector.split(",").map((part) => part.trim()).forEach((part) => {
        assert.match(part, /^\.activation-gates-viz(?:\s|\.|:|$)/, `unscoped activation selector: ${part}`);
      });
    }
  }
  assert.doesNotMatch(css, /^\s*\.agv-/m, "top-level .agv-* selector is not allowed");
});

test("F-2.5 recap makes the F-3 LayerNorm introduction directly discoverable", () => {
  const recap = chapter.match(/<h2[^>]*id="recap"[^>]*>[\s\S]*?(?=<h2|<\/article>)/)?.[0] || "";
  assert.match(recap, /<a href="f-3-transformer-block\.html#layernorm">[^<]*F-3[^<]*LayerNorm[^<]*<\/a>/);
  assert.equal((recap.match(/f-3-transformer-block\.html#layernorm/g) || []).length, 1);
});

test("Pages deployment is gated by focused Node verification rather than browser installation", () => {
  assert.match(workflow, /^\s*verify:\s*$/m);
  assert.match(workflow, /node --test learn\/tests\/activation-gates-viz\.test\.mjs/);
  assert.match(workflow, /node --check learn\/assets\/js\/widgets\/activation-gates-viz\.js/);
  assert.match(workflow, /^\s*needs:\s*verify\s*$/m);
  assert.doesNotMatch(workflow, /playwright|npx\s+playwright/i);
});
