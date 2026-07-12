# Linear / GELU / MLP Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a zero-prerequisite F-2.5 chapter that teaches functions, Linear, GELU, and Transformer MLPs before F-3, then simplify F-3 so it assembles already-understood pieces into a Transformer Block.

**Architecture:** Keep the existing F-3 URL and IDs stable. Insert `f-2-5` in `content.js`, implement the new chapter as static-first HTML plus one lazily initialized `EBWidgets` lab, and scope all new visual rules to `.mlp-basics-viz` / `.mbv-*` or `body[data-section="f-2-5"]`. TDD contracts enforce the pedagogical order, exact toy calculation, navigation, widget accessibility, and 320px behavior.

**Tech Stack:** Static HTML, existing `book.css`, vanilla JavaScript `EBWidgets`, KaTeX 0.16.9, Node `node:test`, Playwright Chromium.

## Global Constraints

- Assume only basic addition, subtraction, and multiplication; define function, Linear, GELU, MLP, `W`, `b`, `d`, and `d_ff` before relying on them.
- Use `f-2-5` and `learn/chapters/foundations/f-2-5-linear-gelu-mlp.html`; do not renumber F-3 through F-8.
- Preserve F-3 public URL and compatibility anchors `#attention-params`, `#mlp`, `#residual-ln`, and `#full-flow`.
- Use the deterministic `2 -> 4 -> 2` calculation from the design spec; static text and widget numbers must agree to three decimals.
- Static HTML must remain sufficient when JavaScript is unavailable; the widget supplements rather than replaces the derivation.
- Do not modify `learn/assets/js/book.js` or `learn/assets/js/widgets/registry.js`.
- Do not add dependencies, generated image assets, global CSS selectors, or unscoped mobile rules.
- Every behavior/content change starts with a failing test and ends with a focused commit.

---

### Task 1: F-2.5 Static Lesson, Navigation, and F-3 Entry

**Files:**
- Create: `learn/tests/f-2-5-mlp-basics-content.test.mjs`
- Create: `learn/chapters/foundations/f-2-5-linear-gelu-mlp.html`
- Modify: `learn/content.js:16-31`
- Modify: `learn/chapters/foundations/f-2-attention.html:148,194`
- Modify: `learn/chapters/foundations/f-3-transformer-block.html:27-70`
- Modify: `learn/tests/f-3-transformer-block-content.test.mjs:9-39`

**Interfaces:**
- Consumes: `window.EBOOK` metadata and the standard chapter shell used by F-2/F-3.
- Produces: navigation ID `f-2-5`, chapter section IDs listed below, F-2/F-3 links, and the static `.f25-*` teaching artifacts used by Task 2.

- [ ] **Step 1: Write the failing F-2.5 content and navigation tests**

Create `learn/tests/f-2-5-mlp-basics-content.test.mjs` with these contracts:

```js
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const chapterUrl = new URL("../chapters/foundations/f-2-5-linear-gelu-mlp.html", import.meta.url);
const contentSource = readFileSync(new URL("../content.js", import.meta.url), "utf8");
const f2 = readFileSync(new URL("../chapters/foundations/f-2-attention.html", import.meta.url), "utf8");
const f3 = readFileSync(new URL("../chapters/foundations/f-3-transformer-block.html", import.meta.url), "utf8");
const requiredIds = [
  "start", "function", "scalar-linear", "vector-linear", "linear-boundaries",
  "gelu", "why-nonlinearity", "mlp-trace", "shared-mlp", "attention-bridge",
  "training", "checkpoint", "recap",
];

test("F-2.5 exists between F-2 and F-3 in navigation", () => {
  assert.ok(existsSync(chapterUrl), "F-2.5 chapter missing");
  const sandbox = { window: {} };
  vm.runInNewContext(contentSource, sandbox);
  const ids = sandbox.window.EBOOK.flat.map((section) => section.id);
  assert.equal(ids.indexOf("f-2-5"), ids.indexOf("f-2") + 1);
  assert.equal(ids.indexOf("f-3"), ids.indexOf("f-2-5") + 1);
  const entry = sandbox.window.EBOOK.flat.find((section) => section.id === "f-2-5");
  assert.equal(entry.file, "chapters/foundations/f-2-5-linear-gelu-mlp.html");
  ["linear", "gelu", "mlp", "ffn", "weight", "bias", "activation", "hidden state"]
    .forEach((keyword) => assert.ok(entry.keywords.toLowerCase().includes(keyword), `missing keyword: ${keyword}`));
});

test("F-2.5 follows a zero-prerequisite teaching order", () => {
  const chapter = readFileSync(chapterUrl, "utf8");
  const ids = [...chapter.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  requiredIds.forEach((id) => assert.ok(ids.includes(id), `missing #${id}`));
  const positions = requiredIds.map((id) => chapter.indexOf(`id="${id}"`));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.ok(chapter.indexOf("y = wx + b") < chapter.indexOf("y = xW + b"));
  assert.ok(chapter.indexOf("逐项手算") < chapter.indexOf("矩阵写法"));
});

test("F-2.5 defines every MLP prerequisite and its boundaries", () => {
  const compact = readFileSync(chapterUrl, "utf8").replace(/\s+/g, " ");
  [
    "只需要加减乘法", "同一条规则", "输入", "权重", "偏置", "输出",
    "仿射变换", "逐元素", "没有可学习参数", "不能跨 token", "可以合并",
    "d_ff", "相同参数", "不同输入", "Attention 负责", "MLP 负责",
    "不是绝对能力边界", "反向传播", "不是人工指定",
  ].forEach((marker) => assert.ok(compact.includes(marker), `missing marker: ${marker}`));
});

test("F-2.5 preserves one exact 2-to-4-to-2 calculation", () => {
  const compact = readFileSync(chapterUrl, "utf8").replace(/\s+/g, " ");
  [
    "[2, -1]", "[3, -2, 0.5, 1]", "[2.996, -0.046, 0.346, 0.841]",
    "[0.614, 1.529]", "2 → 4 → 2", "GELU(x)=x\\Phi(x)",
  ].forEach((marker) => assert.ok(compact.includes(marker), `missing calculation marker: ${marker}`));
});

test("F-2 and F-3 bridge through F-2.5", () => {
  assert.match(f2, /f-2-5-linear-gelu-mlp\.html/);
  assert.match(f3, /f-2-5-linear-gelu-mlp\.html/);
  assert.ok(f3.indexOf('id="block-scene"') < f3.indexOf('id="attention-params"'));
  const intro = f3.slice(0, f3.indexOf('id="residual-ln"'));
  assert.doesNotMatch(intro, /Q=XW_Q|QK\^T|W_1\\in/);
});
```

- [ ] **Step 2: Tighten the existing F-3 test before changing F-3**

In `learn/tests/f-3-transformer-block-content.test.mjs`, prepend `"block-scene"` to `requiredIds`, move `"mainline"` before `"attention-params"`, and add:

```js
test("F-3 starts from the F-2.5 bridge before formulas", () => {
  const intro = chapter.slice(0, chapter.indexOf('id="residual-ln"'));
  assert.match(intro, /f-2-5-linear-gelu-mlp\.html/);
  assert.match(intro, /跨位置通信/);
  assert.match(intro, /每个位置内部计算/);
  assert.doesNotMatch(intro, /Q=XW_Q|QK\^T|W_1\\in/);
});
```

- [ ] **Step 3: Run the tests and verify the RED state**

Run:

```bash
node --test learn/tests/f-2-5-mlp-basics-content.test.mjs learn/tests/f-3-transformer-block-content.test.mjs
```

Expected: FAIL because the F-2.5 file/metadata and `#block-scene` do not exist.

- [ ] **Step 4: Add F-2.5 metadata and navigation links**

Insert this object between `f-2` and `f-3` in `learn/content.js`:

```js
{ id: "f-2-5", title: "Linear、GELU 与 MLP 从零开始", file: "chapters/foundations/f-2-5-linear-gelu-mlp.html",
  keywords: "linear gelu mlp ffn weight bias activation function hidden state d_ff affine nonlinearity 参数共享" },
```

Change the F-2 recap so its next chapter is F-2.5. In the Value aggregation paragraph, link MLP to F-2.5 while retaining F-3 links for Residual and the complete Block.

- [ ] **Step 5: Write the complete static F-2.5 chapter**

Create the standard chapter shell with `body data-section="f-2-5"`, the required section IDs in exact test order, KaTeX assets, `content.js`, `registry.js`, and `book.js`. The static body must include:

```html
<div class="f25-flow" aria-label="MLP 数据流">
  <span>[2, -1]</span><b>Linear 1</b><span>[3, -2, 0.5, 1]</span>
  <b>GELU</b><span>[2.996, -0.046, 0.346, 0.841]</span>
  <b>Linear 2</b><span>[0.614, 1.529]</span>
</div>
```

Use the spec's deterministic `W1/W2/b1/b2`. Before `y=xW+b`, show scalar `y=wx+b` and this explicit vector calculation:

```text
y1 = 2 × 1 + (-1) × (-1) + 0 = 3
y2 = 2 × 0 + (-1) × 2 + 0 = -2
y3 = 2 × 0.5 + (-1) × 0.5 + 0 = 0.5
y4 = 2 × 0.25 + (-1) × (-0.5) + 0 = 1
```

Explain `Linear` library naming versus affine mathematics, GELU's exact formula and boundary behavior, the scalar affine-composition proof, shared parameters across three token rows, GPU batching only after the row-wise account, training, checkpoint questions, and the three-chapter bridge.

- [ ] **Step 6: Rewrite the F-3 entry without re-teaching QKV or MLP algebra**

Place `#block-scene` first, then `#mainline`, then compatibility anchors `#attention-params` and `#mlp`. Use this conceptual flow before any display formula:

```text
Attention：跨位置通信，把别处的信息带到当前行。
MLP：每个位置内部计算，逐行加工当前 hidden state。
Residual：把分支更新加回原 stream。
LayerNorm：稳定送入计算分支的数值尺度。
```

Link `Linear / GELU / MLP` to F-2.5, keep only a three-sentence MLP recap, and move the first detailed display formula to the Residual section. Preserve all later mathematical boundaries and the existing Transformer Block widget.

- [ ] **Step 7: Run tests and verify GREEN**

Run:

```bash
node --test learn/tests/f-2-5-mlp-basics-content.test.mjs learn/tests/f-3-transformer-block-content.test.mjs
```

Expected: all static/navigation tests pass; widget-specific F-2.5 tests are not added until Task 2.

- [ ] **Step 8: Commit the static lesson**

```bash
git add learn/content.js learn/chapters/foundations/f-2-attention.html learn/chapters/foundations/f-2-5-linear-gelu-mlp.html learn/chapters/foundations/f-3-transformer-block.html learn/tests/f-2-5-mlp-basics-content.test.mjs learn/tests/f-3-transformer-block-content.test.mjs
git commit -m "Add zero-prerequisite Linear GELU MLP chapter"
```

---

### Task 2: Accessible MLP Basics Experiment

**Files:**
- Create: `learn/assets/js/widgets/mlp-basics-viz.js`
- Modify: `learn/chapters/foundations/f-2-5-linear-gelu-mlp.html`
- Modify: `learn/tests/f-2-5-mlp-basics-content.test.mjs`

**Interfaces:**
- Consumes: `window.EBWidgets`, `window.EBW.el/svg/clamp`, the deterministic matrices from Task 1, and lazy initialization from `book.js`.
- Produces: `EBWidgets["mlp-basics-viz"](root)`, four `data-view` modes (`linear`, `gelu`, `mlp`, `shared`), and `.mbv-*` DOM hooks for Task 3.

- [ ] **Step 1: Add failing widget contract tests**

Append to the F-2.5 test:

```js
test("F-2.5 wires an accessible four-view MLP basics widget", () => {
  const chapter = readFileSync(chapterUrl, "utf8");
  const widgetUrl = new URL("../assets/js/widgets/mlp-basics-viz.js", import.meta.url);
  assert.ok(existsSync(widgetUrl), "MLP basics widget missing");
  const widget = readFileSync(widgetUrl, "utf8");
  assert.match(chapter, /data-widget="mlp-basics-viz"/);
  assert.ok(chapter.indexOf("mlp-basics-viz.js") < chapter.indexOf("book.js"));
  assert.match(widget, /EBWidgets\["mlp-basics-viz"\]/);
  ["linear", "gelu", "mlp", "shared"].forEach((view) => {
    assert.ok(widget.includes(`data-view: "${view}"`), `missing ${view} view`);
  });
  assert.match(widget, /aria-pressed/);
  assert.match(widget, /aria-live/);
  assert.match(widget, /keydown/);
  assert.match(widget, /Home/);
  assert.match(widget, /End/);
  ["2.995950", "-0.045500", "0.614225", "1.529030"]
    .forEach((value) => assert.ok(widget.includes(value), `missing deterministic value: ${value}`));
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node --test learn/tests/f-2-5-mlp-basics-content.test.mjs
```

Expected: FAIL because `mlp-basics-viz.js` and its script/data-widget hooks are absent.

- [ ] **Step 3: Implement deterministic math helpers and widget shell**

Create `learn/assets/js/widgets/mlp-basics-viz.js` as an IIFE. Its deterministic math block is:

```js
(function () {
  const EBW = window.EBW;
  const views = [
    { label: "Linear 手算", view: "linear" }, // data-view: "linear"
    { label: "GELU 曲线", view: "gelu" }, // data-view: "gelu"
    { label: "完整 MLP", view: "mlp" }, // data-view: "mlp"
    { label: "参数共享", view: "shared" }, // data-view: "shared"
  ];
  const inputs = [
    { label: "她", value: [2, -1] },
    { label: "喜欢", value: [0.5, 1.5] },
    { label: "苹果", value: [-1, 2] },
  ];
  const W1 = [[1, 0, 0.5, 0.25], [-1, 2, 0.5, -0.5]];
  const B1 = [0, 0, 0, 0];
  const W2 = [[0.2, 0.4], [0.1, -0.2], [0.3, 0.2], [-0.1, 0.3]];
  const B2 = [0, 0];
  const erf = (x) => {
    const sign = x < 0 ? -1 : 1;
    const absolute = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * absolute);
    const polynomial = (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t
      - 0.284496736) * t + 0.254829592) * t);
    return sign * (1 - polynomial * Math.exp(-absolute * absolute));
  };
  const gelu = (x) => x * 0.5 * (1 + erf(x / Math.sqrt(2)));
  const affine = (row, weights, bias) => bias.map((b, column) =>
    row.reduce((sum, value, index) => sum + value * weights[index][column], b));
  const trace = (row) => {
    const hidden = affine(row, W1, B1);
    const activated = hidden.map(gelu);
    return { input: row, hidden, activated, output: affine(activated, W2, B2) };
  };
  const reference = Object.freeze({
    geluThree: 2.995950,
    geluMinusTwo: -0.045500,
    outputZero: 0.614225,
    outputOne: 1.529030,
  });
  const format = (value) => Math.abs(value) < 0.0005 ? "0.000" : value.toFixed(3);
})();
```

Keep `reference` in the implementation as an executable consistency check against `trace(inputs[0].value)`, and throw a descriptive error when a value differs by more than `1e-5`. Display values with `format`.

- [ ] **Step 4: Implement four views and accessible controls**

Inside `initMlpBasics`:

- Create a four-button `.mbv-view-controls` segmented control.
- Keep one `activeView`; set exactly one `aria-pressed="true"`.
- Support ArrowLeft/ArrowRight/ArrowUp/ArrowDown, Home, and End.
- Re-render one `.mbv-stage[aria-live="polite"]` without recreating the outer lab.
- `linear`: show four equations and let four output buttons select the highlighted column.
- `gelu`: render an SVG plot from `x=-3` through `x=3`, a range input with `step="0.1"`, a current input/output marker, and the five-row preset table.
- `mlp`: render four stable bands for input, Linear 1, GELU, and Linear 2; a checkbox labeled `显示去掉 GELU 的对比` reveals the collapsed-affine explanation.
- `shared`: render three rows with identical parameter label and different traced outputs; token buttons select the expanded row.

Use text labels and numeric equations so the SVG/colour is never the sole source of meaning.

- [ ] **Step 5: Wire the chapter and verify GREEN**

Add this lab after the full static MLP trace:

```html
<div class="lab">
  <div class="lab-h"><span class="lab-tag">interactive</span><span class="lab-t">MLP 拆解实验台</span></div>
  <div class="lab-body mlp-basics-viz" data-widget="mlp-basics-viz"></div>
  <div class="lab-cap">四个视图复用同一组参数；先逐项算，再观察 GELU、完整流水线和逐位置共享。</div>
</div>
```

Load `../../assets/js/widgets/mlp-basics-viz.js` after `registry.js` and before `book.js`. Run:

```bash
node --check learn/assets/js/widgets/mlp-basics-viz.js
node --test learn/tests/f-2-5-mlp-basics-content.test.mjs
```

Expected: syntax check and all F-2.5 tests pass.

- [ ] **Step 6: Commit the widget**

```bash
git add learn/assets/js/widgets/mlp-basics-viz.js learn/chapters/foundations/f-2-5-linear-gelu-mlp.html learn/tests/f-2-5-mlp-basics-content.test.mjs
git commit -m "Add interactive MLP basics trace"
```

---

### Task 3: Scoped Responsive Styling

**Files:**
- Modify: `learn/assets/css/book.css`
- Modify: `learn/tests/f-2-5-mlp-basics-content.test.mjs`

**Interfaces:**
- Consumes: `.f25-*` static hooks and `.mlp-basics-viz` / `.mbv-*` widget hooks from Tasks 1-2.
- Produces: desktop, tablet, 390px, and 320px layouts without document overflow or global style changes.

- [ ] **Step 1: Add failing CSS scope and mobile tests**

Append:

```js
test("F-2.5 visual rules are scoped and become one column on mobile", () => {
  const css = readFileSync(new URL("../assets/css/book.css", import.meta.url), "utf8");
  assert.match(css, /\.mlp-basics-viz/);
  ["mbv-view-controls", "mbv-stage", "mbv-flow", "mbv-linear-equations", "mbv-gelu-layout", "mbv-shared-grid"]
    .forEach((className) => assert.match(css, new RegExp(`\\.${className}`), `missing .${className}`));
  const mobile = css.match(/@media \(max-width: 560px\) \{([\s\S]*?)\n\}/)?.[1] || "";
  ["f25-flow", "mbv-flow", "mbv-gelu-layout", "mbv-shared-grid"].forEach((className) => {
    assert.match(mobile, new RegExp(`\\.${className}\\s*\\{[^}]*grid-template-columns:\\s*minmax\\(0,\\s*1fr\\)`));
  });
  ["mbv-vector", "mbv-equation", "mbv-matrix", "mbv-result"]
    .forEach((className) => assert.match(mobile, new RegExp(`\\.${className}[^}]*overflow-wrap:\\s*anywhere`)));
  const unscopedStatic = [...css.matchAll(/([^{}]+)\{[^{}]*\}/g)]
    .map((match) => match[1].trim())
    .filter((selector) => selector.includes(".f25-") && !selector.includes('body[data-section="f-2-5"]'));
  assert.deepEqual(unscopedStatic, []);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node --test learn/tests/f-2-5-mlp-basics-content.test.mjs
```

Expected: FAIL on missing `.mlp-basics-viz` and mobile selectors.

- [ ] **Step 3: Add desktop/tablet styles with existing tokens**

Append one scoped block using only existing CSS variables:

```css
.mlp-basics-viz { color: var(--text); }
.mlp-basics-viz .mbv-view-controls { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:6px; }
.mlp-basics-viz .mbv-stage { min-height:360px; margin-top:14px; border-top:1px solid var(--border); }
.mlp-basics-viz .mbv-flow { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); }
.mlp-basics-viz .mbv-gelu-layout { display:grid; grid-template-columns:minmax(0,1.4fr) minmax(220px,.8fr); }
.mlp-basics-viz .mbv-shared-grid { display:grid; grid-template-columns:minmax(150px,.7fr) minmax(0,1.3fr); }
```

Add these interaction and content rules in the same scoped block; declarations may be expanded for spacing and typography but selectors and color roles must remain:

```css
.mlp-basics-viz .mbv-view-button { min-height:42px; border:1px solid var(--border); background:var(--surface); color:var(--muted); }
.mlp-basics-viz .mbv-view-button[aria-pressed="true"] { border-color:var(--interactive); background:color-mix(in srgb,var(--interactive) 12%,var(--surface)); color:var(--text); }
.mlp-basics-viz .mbv-view-button:focus-visible,
.mlp-basics-viz .mbv-output-button:focus-visible,
.mlp-basics-viz .mbv-token-button:focus-visible { outline:2px solid var(--interactive); outline-offset:2px; }
.mlp-basics-viz .mbv-stage-band { padding:12px 0; border-bottom:1px solid var(--border); }
.mlp-basics-viz .mbv-equation,
.mlp-basics-viz .mbv-vector,
.mlp-basics-viz .mbv-matrix,
.mlp-basics-viz .mbv-result { font-family:var(--mono); }
.mlp-basics-viz .mbv-chart { width:100%; aspect-ratio:16/10; min-width:0; }
.mlp-basics-viz .mbv-axis { stroke:var(--muted); }
.mlp-basics-viz .mbv-curve { fill:none; stroke:var(--interactive); stroke-width:3; }
.mlp-basics-viz .mbv-point { fill:var(--warn); stroke:var(--surface); stroke-width:2; }
.mlp-basics-viz .mbv-shared-row[aria-current="true"] { border-left:3px solid var(--accent); }
body[data-section="f-2-5"] .article .f25-flow { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; }
body[data-section="f-2-5"] .article .f25-equation { font-family:var(--mono); overflow-wrap:anywhere; }
body[data-section="f-2-5"] .article .f25-boundary { border-left:3px solid var(--warn); padding-left:14px; }
```

Using existing variables makes the same rules work in light and dark themes. Do not create cards inside the `.lab`.

Add static rules only under `body[data-section="f-2-5"] .article .f25-*` selectors. The static flow may break out to the article's existing wide teaching width on desktop but must remain inside the document grid.

- [ ] **Step 4: Add exact narrow-screen behavior**

Inside the existing `@media (max-width: 560px)` block:

```css
body[data-section="f-2-5"] .article .f25-flow,
.mlp-basics-viz .mbv-flow,
.mlp-basics-viz .mbv-gelu-layout,
.mlp-basics-viz .mbv-shared-grid { grid-template-columns:minmax(0,1fr); }

.mlp-basics-viz .mbv-vector,
.mlp-basics-viz .mbv-equation,
.mlp-basics-viz .mbv-matrix,
.mlp-basics-viz .mbv-result { white-space:normal; overflow-wrap:anywhere; }

.mlp-basics-viz .mbv-view-controls { grid-template-columns:repeat(2,minmax(0,1fr)); }
.mlp-basics-viz .mbv-stage { min-height:520px; }
.mlp-basics-viz .mbv-linear-equations { display:grid; grid-template-columns:minmax(0,1fr); }
.mlp-basics-viz .mbv-weighted-term { display:block; }
.mlp-basics-viz .mbv-chart { width:100%; aspect-ratio:16/10; min-width:0; }
```

- [ ] **Step 5: Run tests and commit**

Run:

```bash
node --test learn/tests/f-2-5-mlp-basics-content.test.mjs learn/tests/f-3-transformer-block-content.test.mjs
git diff --check
```

Expected: all tests pass and no whitespace errors.

```bash
git add learn/assets/css/book.css learn/tests/f-2-5-mlp-basics-content.test.mjs
git commit -m "Make MLP foundations readable on narrow screens"
```

---

### Task 4: Full Verification, Browser Audit, and Integration

**Files:**
- Verify: `learn/chapters/foundations/f-2-5-linear-gelu-mlp.html`
- Verify: `learn/chapters/foundations/f-3-transformer-block.html`
- Verify: all files changed in Tasks 1-3
- Modify only when a failing check identifies a concrete defect.

**Interfaces:**
- Consumes: complete static chapter, widget, scoped CSS, and metadata.
- Produces: reproducible test/browser evidence, clean feature history, merged `main`, successful Pages deployment, and clean worktree.

- [ ] **Step 1: Run permanent tests and all JavaScript syntax checks**

```bash
node --test learn/tests/f-2-5-mlp-basics-content.test.mjs learn/tests/f-3-transformer-block-content.test.mjs
rg --files learn -g '*.js' | sort | xargs -n1 node --check
git diff --check
```

Expected: every test and syntax check passes; `git diff --check` prints nothing.

- [ ] **Step 2: Check every formal chapter's local links**

Run:

```bash
node - <<'NODE'
const fs = require("fs");
const path = require("path");
const root = path.resolve("learn/chapters");
const pages = fs.readdirSync(root, { recursive: true })
  .filter((name) => name.endsWith(".html"))
  .map((name) => path.join(root, name));
const failures = [];
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
for (const page of pages) {
  const source = fs.readFileSync(page, "utf8");
  for (const match of source.matchAll(/\b(?:href|src)=["']([^"'<>]+)["']/g)) {
    const raw = match[1];
    if (/^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(raw)) continue;
    const [pathAndQuery, fragment] = raw.split("#", 2);
    const clean = pathAndQuery.split("?")[0];
    let target = clean ? path.resolve(path.dirname(page), clean) : page;
    if (target.endsWith(path.sep)) target = path.join(target, "index.html");
    if (!fs.existsSync(target)) {
      failures.push(`${path.relative(root, page)} -> missing ${raw}`);
      continue;
    }
    if (fragment && target.endsWith(".html")) {
      const targetSource = fs.readFileSync(target, "utf8");
      const decoded = decodeURIComponent(fragment);
      if (!new RegExp(`(?:id|name)=["']${escape(decoded)}["']`).test(targetSource)) {
        failures.push(`${path.relative(root, page)} -> missing fragment ${raw}`);
      }
    }
  }
}
console.log(JSON.stringify({ pages: pages.length, failures }, null, 2));
if (pages.length !== 62 || failures.length) process.exit(1);
NODE
```

Expected: `pages` is `62` and `failures` is empty.

- [ ] **Step 3: Start an isolated local preview**

Use an unused loopback port:

```bash
python3 -m http.server 8765 --directory learn
```

Preview routes:

```text
http://127.0.0.1:8765/chapters/foundations/f-2-5-linear-gelu-mlp.html
http://127.0.0.1:8765/chapters/foundations/f-3-transformer-block.html
```

- [ ] **Step 4: Run Playwright checks across four viewports**

Audit `1440x900`, `834x1112`, `390x844`, and `320x720`. For F-2.5, scroll the lazy widget into view before waiting for controls, activate all four views, verify exactly one `aria-pressed="true"`, exercise keyboard navigation, move the GELU slider, toggle the no-GELU comparison, and switch all three shared token inputs. For both chapters, verify:

```text
HTTP 200
KaTeX nodes > 0
no raw $$ / \[ / \begin{...} reader text
no document or component horizontal overflow
no clipped formula, table, code, or control text
no console error, pageerror, failed local request, or init failure
light and dark theme both render
```

Capture top/content/widget screenshots under `/tmp/ebench-f25-audit/` and inspect them at original resolution.

- [ ] **Step 5: Fix only evidence-backed browser defects and re-run the full audit**

For any failure, add or tighten a permanent content/CSS regression test first, confirm RED, make the smallest scoped fix, confirm GREEN, and repeat all affected viewports. Do not accept a source-only fix.

- [ ] **Step 6: Stop preview and verify process cleanup**

Terminate the exact HTTP server process and close the Playwright browser. Confirm no process associated with the chosen port or `/tmp/ebench-playwright` remains.

- [ ] **Step 7: Request independent final review**

Ask one read-only reviewer to verify the nine success criteria, mathematical boundaries, navigation, 320px behavior, and screenshots. Resolve all Critical/Important findings with the RED/GREEN loop.

- [ ] **Step 8: Commit final evidence-backed fixes**

If Task 4 produced changes:

```bash
git add learn/content.js learn/assets/css/book.css learn/assets/js/widgets/mlp-basics-viz.js learn/chapters/foundations/f-2-attention.html learn/chapters/foundations/f-2-5-linear-gelu-mlp.html learn/chapters/foundations/f-3-transformer-block.html learn/tests/f-2-5-mlp-basics-content.test.mjs learn/tests/f-3-transformer-block-content.test.mjs
git commit -m "Polish Linear GELU MLP tutorial verification"
```

If Task 4 produced no changes, do not create an empty commit.

- [ ] **Step 9: Integrate, push, deploy, and clean**

Merge the feature branch into `main` without rewriting unrelated history. Push `main`, wait for the exact-HEAD `Deploy Learning Site` workflow, verify the deployed F-2.5 and F-3 URLs with cache-busting SHA query parameters, and repeat desktop/mobile smoke checks against Pages. Finish with:

```text
git status --short --branch: main tracks origin/main with no file entries
git rev-list --left-right --count origin/main...main: 0 0
git worktree list: only the primary main worktree
git branch --list: only main
```

Do not use `git clean` on ignored user data and do not leave persistent proxy settings.
