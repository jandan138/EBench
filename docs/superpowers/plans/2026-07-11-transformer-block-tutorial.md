# Transformer Block Tutorial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn F-3 into a beginner-complete Transformer Block tutorial that answers all 15 MLP/Residual/LayerNorm questions and reinforces the explanation with one accessible interactive trace.

**Architecture:** Keep F-3 as one chapter and preserve its incoming fragment links. First establish a tested static explanation and metadata, then add a zero-dependency widget that reuses one toy tensor across four views. All new styles are scoped to the widget; shared site runtime remains unchanged.

**Tech Stack:** Static HTML/CSS/vanilla JavaScript, KaTeX through the existing runtime, Node 24 built-in test runner, Playwright from the environment for browser QA.

## Global Constraints

- Follow `docs/superpowers/specs/2026-07-11-transformer-block-tutorial-design.md` exactly.
- Preserve `#attention-params`, `#mlp`, `#residual-ln`, and `#full-flow` for links from F-2.
- Keep the canonical tutorial flow pre-norm; label post-norm only as a variant.
- Never claim Residual is invertible, `F(x)` is necessarily small, gradients cannot vanish, or LayerNorm is lossless.
- Normalize `[B,n,d]` independently over `d` for every `(b,i)` pair.
- Essential explanations and the Residual bypass drawing must exist in static HTML without JavaScript.
- Do not modify `learn/assets/js/book.js`, `learn/assets/js/widgets/registry.js`, F-2, or F-4.
- New CSS must be scoped under `.transformer-block-viz` or `.tbv-*`.
- The widget must work at 320px, expose keyboard focus and selected state, and communicate without color alone.

---

### Task 1: TDD The Static Tutorial And Search Metadata

**Files:**
- Create: `learn/tests/f-3-transformer-block-content.test.mjs`
- Modify: `learn/chapters/foundations/f-3-transformer-block.html`
- Modify: `learn/content.js`

**Interfaces:**
- Consumes: Existing complete-page HTML shell, KaTeX conventions, `.callout`, `.bridge`, `.math-block`, `.code`, and table styles.
- Produces: Stable section IDs and `data-answers` mapping that Task 2 and final browser QA consume.

- [ ] **Step 1: Write the failing content contract**

Create a Node built-in test with these exact structural checks:

```js
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
```

- [ ] **Step 2: Run RED and verify the reason**

Run: `node --test learn/tests/f-3-transformer-block-content.test.mjs`

Expected: FAIL because the current chapter lacks the new section IDs, 1-15 mapping, explicit caveats, and expanded metadata. The test file itself must load without syntax or path errors.

- [ ] **Step 3: Rewrite the static chapter and metadata**

Implement every section and formula from the design spec. Use these exact pre-norm equations:

```html
<div class="math-block">$$A^\ell = H^\ell + \operatorname{Attn}^\ell\!\left(\operatorname{LN}_1^\ell(H^\ell)\right)$$
$$H^{\ell+1} = A^\ell + \operatorname{MLP}^\ell\!\left(\operatorname{LN}_2^\ell(A^\ell)\right)$$</div>
```

Use row-vector MLP notation and LayerNorm notation from the design spec. Include:

- An immediate direct answer that Attention can feed a head directly, while the MLP adds useful nonlinear per-position capacity.
- A shared-function numeric example and the identical-input boundary.
- A static two-branch Residual diagram in a text code block.
- Separate forward and gradient subsections with `I + J_F`.
- `[B,n,d]` matrix-axis drawing and `[1,2,3]` normalization example.
- The non-invertibility caveat, equal-feature edge case, and no `[-1,1]` bound.
- A six-step pre-norm trace, variant table, depth explanation, and task-head table.
- Links to the five primary references listed by the design spec.

Update the F-3 title to `Transformer Block 从零开始（MLP / Residual / LayerNorm）` and add all tested keywords without changing its ID or file path.

- [ ] **Step 4: Run GREEN and static checks**

Run: `node --test learn/tests/f-3-transformer-block-content.test.mjs`

Expected: 4 tests pass, 0 fail.

Run: `node --check learn/content.js`

Expected: exit 0.

Run: `git diff --check`

Expected: exit 0.

- [ ] **Step 5: Commit Task 1**

```bash
git add learn/tests/f-3-transformer-block-content.test.mjs learn/chapters/foundations/f-3-transformer-block.html learn/content.js
git commit -m "Expand Transformer Block foundations tutorial"
```

### Task 2: TDD The Interactive Block Trace

**Files:**
- Modify: `learn/tests/f-3-transformer-block-content.test.mjs`
- Modify: `learn/chapters/foundations/f-3-transformer-block.html`
- Create: `learn/assets/js/widgets/transformer-block-viz.js`
- Modify: `learn/assets/css/book.css`

**Interfaces:**
- Consumes: `window.EBWidgets`, `window.EBW.el`, lazy mounting by `book.js`, Task 1's `#block-trace`, and the existing `.lab` shell.
- Produces: Registration key `transformer-block-viz`, four accessible view buttons, one live panel, and `.transformer-block-viz` / `.tbv-*` scoped styles.

- [ ] **Step 1: Extend the test before creating the widget**

Append checks that read the future widget and CSS paths only inside the test body so the test reports an assertion failure rather than a module-load error. Verify:

```js
test("F-3 wires an accessible four-view Transformer Block widget", () => {
  const widgetPath = new URL("../assets/js/widgets/transformer-block-viz.js", import.meta.url);
  const cssPath = new URL("../assets/css/book.css", import.meta.url);
  const widget = readFileSync(widgetPath, "utf8");
  const css = readFileSync(cssPath, "utf8");
  assert.match(chapter, /data-widget="transformer-block-viz"/);
  assert.ok(chapter.indexOf("transformer-block-viz.js") < chapter.indexOf("book.js"));
  assert.match(widget, /EBWidgets\["transformer-block-viz"\]/);
  ["block", "mlp", "residual", "norm"].forEach((view) => assert.ok(widget.includes(`data-view: "${view}"`)));
  assert.match(widget, /aria-pressed/);
  assert.match(widget, /keydown/);
  assert.match(css, /\.transformer-block-viz/);
  assert.match(css, /@media \(max-width: 560px\)/);
});
```

Also add `readFileSync` path existence handling with `existsSync` so the expected RED message is `widget file missing`, not an unhandled exception.

- [ ] **Step 2: Run RED and verify the reason**

Run: `node --test learn/tests/f-3-transformer-block-content.test.mjs`

Expected: the original four tests pass and the new widget test fails because `transformer-block-viz.js` and its mount do not exist.

- [ ] **Step 3: Implement the widget, mount, and scoped styles**

At `#block-trace`, add exactly one `.lab` with `data-widget="transformer-block-viz"`. Load its script after `registry.js` and before `book.js`.

The widget must:

- Register `window.EBWidgets["transformer-block-viz"] = function (root) { ... }`.
- Reuse tokens `她`, `喜欢`, `苹果` and their three four-dimensional toy rows in every view.
- Create four `type="button"` controls with `data-view`, `aria-pressed`, visible labels, and non-color selected styling.
- Support ArrowLeft/ArrowRight/ArrowUp/ArrowDown, Home, and End without global listeners.
- Render one panel with `aria-live="polite"` and view-specific static DOM.
- Show two sequential residual sublayers in `block`; the same MLP box on three rows in `mlp`; branch plus bypass in `residual`; and row-wise `[B,n,d]` normalization in `norm`.
- Avoid animation, timers, canvas, SVG icons, external dependencies, dynamic KaTeX, and changes to the shared registry helper.

Add responsive CSS under `.transformer-block-viz` and `.tbv-*`. Desktop uses compact horizontal stage groups; at 560px each stage and MLP row become vertical or two-column, controls wrap into a stable 2x2 layout, and long formulas use local horizontal scrolling without document overflow. Add `:focus-visible` and dark-theme-compatible variable colors only.

- [ ] **Step 4: Run GREEN and syntax checks**

Run: `node --test learn/tests/f-3-transformer-block-content.test.mjs`

Expected: 5 tests pass, 0 fail.

Run: `node --check learn/assets/js/widgets/transformer-block-viz.js`

Expected: exit 0.

Run: `rg --files learn -g '*.js' | sort | xargs -n1 node --check`

Expected: exit 0.

Run: `git diff --check`

Expected: exit 0.

- [ ] **Step 5: Commit Task 2**

```bash
git add learn/tests/f-3-transformer-block-content.test.mjs learn/chapters/foundations/f-3-transformer-block.html learn/assets/js/widgets/transformer-block-viz.js learn/assets/css/book.css
git commit -m "Add interactive Transformer Block trace"
```

### Task 3: Integrated Browser And Link Verification

**Files:**
- Modify only if a failing regression test requires it: files owned by Tasks 1-2.

**Interfaces:**
- Consumes: completed static chapter and widget.
- Produces: reproducible audit artifacts under ignored `tmp/f3-transformer-block-audit/` and a clean verified branch.

- [ ] **Step 1: Run the permanent tests and repository-wide static checks**

Run the content test, all JS syntax checks, a Node local-link/fragment scan over all `learn/chapters/**/*.html`, and `git diff --check`. All must exit 0.

- [ ] **Step 2: Start the static preview**

Run: `python3 -m http.server 8092 --directory learn`

Expected: server listens on `http://127.0.0.1:8092/`. If occupied, increment the port and record it.

- [ ] **Step 3: Run Playwright audit**

Use `/tmp/ebench-playwright/node_modules/playwright`. Audit F-3 at `1440x900`, `834x1112`, `390x844`, and `320x720`; scroll the full page; wait for KaTeX and lazy widget mounting; click all four modes; exercise keyboard navigation; toggle dark theme; and capture screenshots plus JSON results under `tmp/f3-transformer-block-audit/`.

Fail on document overflow, missing/duplicate selected state, raw `$$`, clipped controls, unregistered widget messages, failed local requests, page errors, or console errors other than unavailable third-party fonts.

- [ ] **Step 4: Fix regressions through TDD**

For each defect, add or tighten the permanent test when representable, verify RED, make the smallest production correction, then re-run GREEN and the affected browser viewport.

- [ ] **Step 5: Stop the preview and verify branch state**

Stop the server. Run the permanent tests again, `git diff --check`, `git status --short --branch`, and inspect `git diff --stat` plus the complete branch diff.

Expected: no running preview process, no untracked audit artifacts outside ignored `tmp/`, and only intended committed changes.

## Plan Self-Review

- Spec coverage: all 15 questions map to exact anchors and test markers; static and interactive explanations are both covered.
- Placeholder scan: no deferred content, undefined behavior, or optional implementation decisions remain.
- Interface consistency: the HTML mount, JS registration key, CSS scope, test path, and script order all use `transformer-block-viz`.
- Scope: F-2 links remain valid; shared runtime and unrelated Foundations chapters remain untouched.
