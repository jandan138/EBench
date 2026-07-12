import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const chapter = readFileSync(new URL("../chapters/foundations/f-3-transformer-block.html", import.meta.url), "utf8");
const contentSource = readFileSync(new URL("../content.js", import.meta.url), "utf8");
const ids = [...chapter.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
const requiredIds = [
  "block-scene", "mainline", "attention-params", "mlp",
  "residual-ln", "residual-gradient", "layernorm", "layernorm-axis",
  "layernorm-semantics", "full-flow", "block-trace", "variants",
  "deep-stack", "training-heads", "checkpoint", "recap",
];
const section = (id) => chapter.match(
  new RegExp(`<h2[^>]*id="${id}"[^>]*>[\\s\\S]*?(?=<h2|</article>)`),
)?.[0].replace(/\s+/g, " ") || "";

test("F-3 has stable unique sections in teaching order", () => {
  assert.equal(new Set(ids).size, ids.length);
  requiredIds.forEach((id) => assert.ok(ids.includes(id), `missing #${id}`));
  const positions = requiredIds.map((id) => chapter.indexOf(`id="${id}"`));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test("F-3 keeps old MLP fragments as compatibility anchors without duplicate lessons", () => {
  ["shared-mlp", "mlp-expressivity"].forEach((id) => {
    assert.match(chapter, new RegExp(`<a id="${id}"[^>]*aria-hidden="true"`), `missing compatibility #${id}`);
  });
});

test("F-3 opens with a contextual scene and formula-free four-role mainline", () => {
  assert.ok(chapter.indexOf('id="block-scene"') < chapter.indexOf('id="mainline"'));
  assert.match(section("block-scene"), /她/);
  assert.match(section("block-scene"), /小红/);
  const mainline = section("mainline");
  ["Attention", "MLP", "Residual", "LayerNorm"].forEach((role) => assert.ok(mainline.includes(role), `#mainline missing ${role}`));
  const intro = chapter.slice(0, chapter.indexOf('id="residual-ln"'));
  ["Q=XW_Q", "QK^T", "W_1\\in"].forEach((formula) => assert.ok(!intro.includes(formula), `intro repeats ${formula}`));
});

test("F-3 preserves concise bridge semantics at stable anchors", () => {
  const attention = section("attention-params");
  assert.ok(attention.includes("W_O"));
  assert.match(attention, /回到.*宽度.*d/);

  const mlp = section("mlp");
  assert.match(mlp, /f-2-5-linear-gelu-mlp\.html#mlp-trace/);
  ["Linear 1", "GELU", "Linear 2", "d_ff", "回到 d"].forEach((marker) => assert.ok(mlp.includes(marker), `#mlp missing ${marker}`));

  const residual = section("residual-ln");
  assert.ok(residual.includes("y=x+F(x)"));
  assert.match(residual, /x ───────────────┐/);

  const fullFlow = section("full-flow");
  assert.ok(fullFlow.includes("LN_1 -&gt; Attention -&gt; + -&gt; LN_2 -&gt; MLP -&gt; +"));
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

test("F-3 wires an accessible four-view Transformer Block widget", () => {
  const widgetPath = new URL("../assets/js/widgets/transformer-block-viz.js", import.meta.url);
  const cssPath = new URL("../assets/css/book.css", import.meta.url);
  assert.ok(existsSync(widgetPath), "widget file missing");
  assert.ok(existsSync(cssPath), "widget CSS file missing");
  const widget = readFileSync(widgetPath, "utf8");
  const css = readFileSync(cssPath, "utf8");

  assert.match(chapter, /data-widget="transformer-block-viz"/);
  assert.ok(chapter.indexOf("transformer-block-viz.js") < chapter.indexOf("book.js"));
  assert.match(widget, /EBWidgets\["transformer-block-viz"\]/);
  ["block", "mlp", "residual", "norm"].forEach((view) => {
    assert.ok(widget.includes(`data-view: "${view}"`), `missing ${view} view`);
  });
  assert.match(widget, /aria-pressed/);
  assert.match(widget, /aria-live/);
  assert.match(widget, /keydown/);
  assert.match(css, /\.transformer-block-viz/);
  assert.match(css, /@media \(max-width: 560px\)/);
});

test("F-3 stacks Block and MLP traces in one mobile column", () => {
  const css = readFileSync(new URL("../assets/css/book.css", import.meta.url), "utf8");
  const mobile = css.match(/@media \(max-width: 560px\) \{([\s\S]*?)\n\}/)?.[1] || "";

  ["tbv-stages", "tbv-mlp-row"].forEach((className) => {
    assert.match(
      mobile,
      new RegExp(`\\.${className}\\s*\\{[^}]*grid-template-columns:\\s*minmax\\(0,\\s*1fr\\)\\s*;`),
      `${className} must use one mobile column`,
    );
    assert.match(
      mobile,
      new RegExp(`\\.${className}\\s*>\\s*\\.tbv-arrow\\s*\\{[^}]*display:\\s*none`),
      `${className} arrows must be hidden on mobile`,
    );
  });
  assert.doesNotMatch(mobile, /grid-template-columns:[^;]*(?:20|24)px/);
  assert.doesNotMatch(mobile, /\.tbv-(?:stages|mlp-row)[^\{]*:nth-of-type/);
  assert.doesNotMatch(mobile, /\.tbv-row-output\s*\{[^}]*grid-column/);
});

test("F-3 keeps narrow-mobile teaching artifacts readable", () => {
  const css = readFileSync(new URL("../assets/css/book.css", import.meta.url), "utf8");
  const mobile = css.match(/@media \(max-width: 560px\) \{([\s\S]*?)\n\}/)?.[1] || "";
  const section = (id) => chapter.match(new RegExp(`id="${id}"[\\s\\S]*?(?=<h2|</article>)`))?.[0] || "";
  const displayRows = (id) => [...section(id).matchAll(/\$\$([\s\S]*?)\$\$/g)]
    .map((match) => match[1].replace(/\s+/g, " ").trim());

  [["attention-params", 0], ["mlp", 0]].forEach(([id, minimumRows]) => {
    const rows = displayRows(id);
    assert.ok(rows.length >= minimumRows, `#${id} must split its formula into short display rows`);
    rows.forEach((row) => assert.ok(row.length <= 72, `#${id} display row is too long: ${row}`));
  });

  const staticLines = [...chapter.matchAll(/<pre><code>([\s\S]*?)<\/code><\/pre>/g)]
    .flatMap((match) => match[1].replaceAll("&gt;", ">").split("\n"));
  staticLines.forEach((line) => {
    assert.ok([...line].length <= 30, `static teaching line is too long (${[...line].length}): ${line}`);
  });

  [
    ["variants", ["变体", "最小区别", "本节怎么读"]],
    ["training-heads", ["系统", "任务头常读什么", "输出例子"]],
  ].forEach(([id, labels]) => {
    const table = section(id).match(/<table[^>]*>[\s\S]*?<\/table>/)?.[0] || "";
    assert.match(table, /<table class="f3-mobile-stack">/, `#${id} needs the mobile-stack class`);
    const cells = [...table.matchAll(/<td([^>]*)>/g)];
    assert.ok(cells.length > 0, `#${id} table body cells missing`);
    cells.forEach((cell, index) => {
      assert.match(cell[1], new RegExp(`data-label="${labels[index % labels.length]}"`), `#${id} cell ${index + 1} needs its column label`);
    });
  });

  const staticTableRules = [...mobile.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((rule) => rule[1].includes("f3-mobile-stack"));
  const staticTableScope = 'body[data-section="f-3"] .article table.f3-mobile-stack';

  assert.ok(staticTableRules.length > 0, "mobile static-table rules missing");
  staticTableRules.forEach(([, selector]) => {
    assert.match(
      selector.trim(),
      /^body\[data-section="f-3"\]\s+\.article\s+table\.f3-mobile-stack(?:\s|:|$)/,
      `static-table selector must be scoped to F-3: ${selector.trim()}`,
    );
  });
  assert.doesNotMatch(
    mobile,
    /^\s*\.f3-mobile-stack(?:\s|:|\{|$)/m,
    "unscoped .f3-mobile-stack mobile selector is not allowed",
  );

  const staticTableRule = (suffix) => staticTableRules
    .find(([, selector]) => selector.trim() === `${staticTableScope}${suffix}`)?.[2] || "";
  const tableRule = staticTableRule("");
  const cellRule = staticTableRule(" td");
  const headerRule = staticTableRule(" thead");

  assert.match(tableRule, /overflow-x:\s*visible/, "mobile table override needs cascade-winning specificity");
  assert.match(tableRule, /contain:\s*none/);
  assert.doesNotMatch(tableRule, /!important/, "mobile table override must win without !important");
  assert.match(cellRule, /min-width:\s*0/, "mobile cells must beat later global cell minimums");
  assert.doesNotMatch(headerRule, /display:\s*none/, "mobile headers must remain in the accessibility tree");
  assert.match(headerRule, /position:\s*absolute/);
  assert.match(headerRule, /width:\s*1px/);
  assert.match(headerRule, /height:\s*1px/);
  assert.match(headerRule, /overflow:\s*hidden/);
  assert.match(headerRule, /(?:clip:\s*rect\(|clip-path:\s*inset\()/);
  assert.match(mobile, /body\[data-section="f-3"\]\s+\.article\s+table\.f3-mobile-stack\s+tr\s*\{[^}]*display:\s*block/);
  assert.match(mobile, /body\[data-section="f-3"\]\s+\.article\s+table\.f3-mobile-stack\s+td::before\s*\{[^}]*content:\s*attr\(data-label\)/);

  const rules = [...mobile.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  ["tbv-tensor-row code", "tbv-row-input code", "tbv-normalized", "tbv-formula", "tbv-route span"]
    .forEach((target) => {
      const body = rules.find((rule) => rule[1].includes(target))?.[2] || "";
      assert.match(body, /white-space:\s*normal/, `${target} must wrap on mobile`);
      assert.match(body, /overflow-wrap:\s*anywhere/, `${target} must break long values on mobile`);
    });
  assert.match(mobile, /\.tbv-norm-row\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(mobile, /\.tbv-axis\s*\{[^}]*grid-column:\s*auto[^}]*grid-row:\s*auto/);
  assert.match(mobile, /\.tbv-normalized\s*\{[^}]*grid-column:\s*auto[^}]*grid-row:\s*auto/);
});
