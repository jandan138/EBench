# Linear / GELU / MLP Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Insert a zero-prerequisite F-2.5 chapter that teaches function, Linear, GELU, and a standard dense Transformer MLP before F-3, then make F-3 assemble those understood pieces into a complete Block.

**Architecture:** Keep F-3 through F-8 IDs and URLs stable. Add a static-first F-2.5 chapter, a small executable math core shared by tests and one `EBWidgets` visualization, section-scoped outcome tests, a `content.js`-driven navigation integrity test, and a permanent Playwright audit that starts its own random-port server or targets Pages.

**Tech Stack:** Static HTML, existing `book.css`, vanilla JavaScript/UMD, `EBWidgets`, KaTeX 0.16.9, Node `node:test`, Playwright Chromium 1.61.1 already available at `/tmp/ebench-playwright` in this environment.

## Global Constraints

- Assume only basic addition, subtraction, and multiplication; define function, Linear, GELU, MLP, `W`, `b`, `d`, and `d_ff` before relying on them.
- Use ID `f-2-5` and file `learn/chapters/foundations/f-2-5-linear-gelu-mlp.html`; do not renumber F-3 through F-8.
- Preserve F-3 public URL and semantic compatibility of `#attention-params`, `#mlp`, `#residual-ln`, and `#full-flow`.
- Use row-vector notation. A library `Linear` with bias is mathematically affine: `y=xW+b`, `W in R^(d_in x d_out)`, `b in R^d_out`.
- State that two affine transforms combine as `W*=W_1W_2`, `b*=b_1W_2+b_2`; GELU usually prevents a general affine collapse, while special parameters can still yield an affine mapping.
- Distinguish exact GELU `x Phi(x)`, numerical evaluation, and the common tanh approximation; mention possible negative outputs and local non-monotonicity on the negative axis.
- Scope parameter-sharing claims to a standard dense MLP within one layer. Different inputs can, but need not, produce different outputs; MoE is an explicit exception.
- State that backpropagation computes gradients and the optimizer updates only present, trainable parameters. Fine-tuning may start from a checkpoint and frozen parameters do not update.
- Use the deterministic `2 -> 4 -> 2` parameters and values from the design spec; static and rendered values must agree within `0.001`.
- Static HTML and `<noscript>` must remain sufficient without widget JavaScript.
- Do not modify `learn/assets/js/book.js` or `learn/assets/js/widgets/registry.js`, add dependencies, or add unscoped `.f25-*` CSS.
- Every behavior/content change follows RED, observed expected failure, minimal GREEN, and regression verification.

## Execution Preflight

- [ ] Record `BASE_SHA=$(git rev-parse HEAD)`, `git status --short --branch`, `git branch --list`, and `git worktree list`.
- [ ] Use `superpowers:using-git-worktrees`. Verify `.worktrees` exists and is ignored, then create only `.worktrees/f25-mlp-foundations` on branch `feature/f25-mlp-foundations` from `BASE_SHA`.
- [ ] In the isolated worktree, run `node --test learn/tests/f-3-transformer-block-content.test.mjs`; expected baseline is 7 passing, 0 failing.
- [ ] Create `.superpowers/sdd/progress.md` in the feature worktree and record Task 1, Task 2, Task 3 as pending.

---

### Task 1: Static Learning Path, Navigation Integrity, and F-3 Bridge

**Files:**
- Create: `learn/tests/f-2-5-mlp-basics-content.test.mjs`
- Create: `learn/tests/foundations-navigation-integrity.test.mjs`
- Create: `learn/chapters/foundations/f-2-5-linear-gelu-mlp.html`
- Modify: `learn/content.js`
- Modify: `learn/chapters/foundations/f-2-attention.html`
- Modify: `learn/chapters/foundations/f-3-transformer-block.html`
- Modify: `learn/tests/f-3-transformer-block-content.test.mjs`

**Interfaces:**
- Consumes: `window.EBOOK.flat`, the standard chapter shell, existing F-2/F-3 anchors.
- Produces: F-2.5 section IDs, exact F-2 -> F-2.5 -> F-3 navigation, static toy derivation, and semantically stable F-3 anchors.

- [ ] **Step 1: Write section-scoped outcome tests**

Create a helper that extracts one section without reading later sections:

```js
const section = (id) => chapter.match(
  new RegExp(`<h2[^>]*id="${id}"[^>]*>[\\s\\S]*?(?=<h2|</article>)`),
)?.[0].replace(/\s+/g, " ") || "";
```

Add one named test for each outcome rather than one whole-page keyword loop:

1. `#function` contains `f(x)=2x+1`, at least two different substituted inputs/outputs, `同一条规则`, and checkpoint item `data-check="outcome-1"`.
2. `#vector-linear` contains four full equations in which both input terms and one bias appear; it then introduces `y = xW + b` after the phrase `矩阵写法`.
3. `#vector-linear` contains an axis table and exact shapes `W:[d_in,d_out]`, `b:[d_out]`; prose maps rows to input features and columns to output features.
4. `#gelu` contains `GELU(x)=x\\Phi(x)`, `逐元素`, no learned matrix, no token communication, possible negative output, not `[0,1]`, and the non-monotone boundary.
5. `#why-nonlinearity` contains `W_*=W_1W_2`, `b_*=b_1W_2+b_2`, `通常不再是 affine`, and `特殊参数`.
6. `#mlp-trace` contains the deterministic four stage values and `2 → 4 → 2`; executable numeric correctness belongs to Task 2.
7. `#shared-mlp` states same parameters, different inputs can differ, deterministic same-input caveat, standard dense layer scope, and MoE exception.
8. `#attention-bridge` states cross-position communication versus within-position computation, explicitly says this is not an exclusive boundary, and says Attention may structurally connect directly to a head.
9. `#training` distinguishes backpropagation from optimizer updates; names `W_1,b_1,W_2,b_2`, initialization versus checkpoint, trainable/frozen parameters, optional bias, and manually assigned roles.

Require checkpoint items `data-check="outcome-1"` through `data-check="outcome-9"` exactly once.

- [ ] **Step 2: Write the permanent navigation integrity test**

`learn/tests/foundations-navigation-integrity.test.mjs` must evaluate `learn/content.js` in `vm`, use `window.EBOOK.flat` as the only formal-page source, and assert:

```text
flat.length === 62
all section IDs unique
all registered files unique and present under learn/
f-2 index + 1 === f-2-5 index
f-2-5 index + 1 === f-3 index
every local href/src in registered HTML resolves
every local HTML fragment resolves to id/name
F-2 next-learning link is f-2-5-linear-gelu-mlp.html#start
F-2 deep links retain exact F-3 destinations for #attention-params, #residual-ln, #full-flow
F-3 links back to f-2-5-linear-gelu-mlp.html#mlp-trace
```

Keep F-3 internal order/semantics out of this navigation test.

- [ ] **Step 3: Tighten F-3-owned compatibility tests**

In `f-3-transformer-block-content.test.mjs` add `#block-scene` before `#mainline`, then assert section-local semantics:

```text
#attention-params mentions W_O and return to width d
#mlp links F-2.5 and recaps Linear 1, GELU, Linear 2, d_ff, return to d
#residual-ln still contains y=x+F(x) and the bypass diagram
#full-flow still contains LN_1 -> Attention -> + -> LN_2 -> MLP -> +
intro before #residual-ln contains no Q=XW_Q, QK^T, or W_1 dimension derivation
```

Remove `#shared-mlp` and `#mlp-expressivity` from required teaching-order IDs. Require compatibility anchors for those two old fragments without requiring duplicate sections.

- [ ] **Step 4: Verify RED**

Run:

```bash
node --test learn/tests/f-2-5-mlp-basics-content.test.mjs learn/tests/foundations-navigation-integrity.test.mjs learn/tests/f-3-transformer-block-content.test.mjs
```

Expected: F-2.5 file/metadata missing, formal count still 61, F-3 `#block-scene` and bridge semantics missing.

- [ ] **Step 5: Implement metadata and static F-2.5**

Insert exactly this metadata between F-2 and F-3:

```js
{ id: "f-2-5", title: "Linear、GELU 与 MLP 从零开始", file: "chapters/foundations/f-2-5-linear-gelu-mlp.html",
  keywords: "linear gelu mlp ffn weight bias activation function hidden state d_ff affine nonlinearity 参数共享" },
```

Create the standard HTML shell with required IDs in this order:

```text
start, function, scalar-linear, vector-linear, linear-boundaries, gelu,
why-nonlinearity, mlp-trace, shared-mlp, attention-bridge, training,
checkpoint, recap
```

Use four grouped flow stages, not seven loose grid children:

```html
<div class="f25-flow" aria-label="MLP 数据流">
  <div class="f25-stage"><b>输入</b><code>[2, -1]</code></div>
  <div class="f25-stage"><b>Linear 1</b><code>[3, -2, 0.5, 1]</code></div>
  <div class="f25-stage"><b>GELU</b><code>[2.996, -0.046, 0.346, 0.841]</code></div>
  <div class="f25-stage"><b>Linear 2</b><code>[0.614, 1.529]</code></div>
</div>
```

Every static table uses `class="f25-mobile-stack"` and `data-label` on body cells. Split display math into one short equation per KaTeX block. Include all nine checkpoint IDs.

- [ ] **Step 6: Update F-2 and rebuild F-3's opening**

F-2 routes MLP prerequisites to `f-2-5-linear-gelu-mlp.html#start`; its W_O/Residual/full-flow deep links retain exact F-3 fragments.

F-3 begins with a concrete “她 / 小红” contextual-state scene, then the no-formula four-role mainline. `#attention-params` is a short W_O/width-d recap. `#mlp` is a short three-stage recap linked to `f-2-5-linear-gelu-mlp.html#mlp-trace`. Preserve old `#shared-mlp` and `#mlp-expressivity` as zero-height scroll-margin-aware anchor aliases adjacent to `#mlp`, not duplicate teaching sections.

- [ ] **Step 7: Verify GREEN and commit**

Run the three tests from Step 4 and the existing F-3 suite. Expected: all pass.

```bash
git add learn/content.js learn/chapters/foundations/f-2-attention.html learn/chapters/foundations/f-2-5-linear-gelu-mlp.html learn/chapters/foundations/f-3-transformer-block.html learn/tests/f-2-5-mlp-basics-content.test.mjs learn/tests/foundations-navigation-integrity.test.mjs learn/tests/f-3-transformer-block-content.test.mjs
git commit -m "Add zero-prerequisite Linear GELU MLP chapter"
```

Record Task 1 commit range and test command in `.superpowers/sdd/progress.md` after task review is clean.

---

### Task 2: Complete MLP Experiment Vertical Slice

**Files:**
- Create: `learn/assets/js/widgets/mlp-basics-core.js`
- Create: `learn/assets/js/widgets/mlp-basics-viz.js`
- Create: `learn/tests/f-2-5-mlp-basics-math.test.mjs`
- Create: `learn/tests/f-2-5-browser-audit.mjs`
- Modify: `learn/tests/f-2-5-mlp-basics-content.test.mjs`
- Modify: `learn/chapters/foundations/f-2-5-linear-gelu-mlp.html`
- Modify: `learn/assets/css/book.css`

**Interfaces:**
- `mlp-basics-core.js` exports in Node and sets `window.EBMLPBasics` in browsers: `erf(number)`, `gelu(number)`, `affine(number[],number[][],number[])`, `trace(number[])`, `format(number)` and frozen `inputs/W1/B1/W2/B2`.
- `mlp-basics-viz.js` registers `EBWidgets["mlp-basics-viz"]`, consumes `window.EBMLPBasics`, and renders four views: `linear`, `gelu`, `mlp`, `shared`.
- `f-2-5-browser-audit.mjs` accepts optional `EBENCH_BASE_URL`; without it, starts and closes a Node static server on port 0 in `finally`.

- [ ] **Step 1: Write executable math tests**

Require the UMD core with `createRequire`. Test with numeric tolerances, not source literals:

```js
assert.deepEqual(core.affine([2, -1], core.W1, core.B1), [3, -2, 0.5, 1]);
assert.ok(Math.abs(core.gelu(3) - 2.995950098) < 1e-6);
assert.ok(Math.abs(core.gelu(-2) + 0.045500126) < 1e-6);
const first = core.trace([2, -1]);
assert.ok(Math.abs(first.output[0] - 0.614224903) < 1e-6);
assert.ok(Math.abs(first.output[1] - 1.529029732) < 1e-6);
assert.equal(core.format(0.00001), "0.000");
assert.equal(core.format(-0.045500126), "-0.046");
```

Trace all three declared inputs, assert shape `2 -> 4 -> 4 -> 2`, finite values, same frozen parameter object, and at least two distinct outputs. Parse static `data-value` attributes from F-2.5 and assert they match `trace(inputs[0])` within `0.001`.

- [ ] **Step 2: Add wiring/accessibility source tests**

Only assert stable wiring that behavior tests cannot load without:

```text
registry.js < mlp-basics-core.js < mlp-basics-viz.js < book.js
data-widget="mlp-basics-viz"
<noscript> contains the complete four-stage numeric trace
core and widget files exist
no unscoped selector containing .f25-
```

Do not assert comments, duplicated constants, or regex-extracted media blocks.

- [ ] **Step 3: Write the permanent Playwright audit before implementation**

The script uses `createRequire` to load `/tmp/ebench-playwright/node_modules/playwright`, starts a minimal static server from `learn/` on `127.0.0.1:0` when `EBENCH_BASE_URL` is absent, and always closes browser/server in `finally`.

For `1440x900`, `834x1112`, `390x844`, `320x720`, and light/dark:

```text
load F-2.5 and F-3 with HTTP 200
capture console errors, page errors, failed local requests
assert KaTeX rendered and no reader-visible raw math
assert document, article, static tables/formulas, and widget have no incoherent overflow/clipping
assert F-2.5 widget is unmounted before intersection, mounted after scroll, and still has exactly four top-level view buttons after leaving/re-entering
activate four views; exactly one aria-pressed=true and focus stays in the selected control
exercise Arrow keys, Home, End, Enter, Space
select every Linear output and shared token; each named group has exactly one selected item
move labeled GELU range; rendered input/output changes and concise live region updates
toggle labeled no-GELU checkbox
assert SVG has an accessible label or is explicitly decorative with equivalent text
assert 320px computed grids are one column and view controls are two columns
assert visible focus outline has non-zero width and selected/focus contrast is visibly distinct in both themes
direct-load F-3 compatibility fragments; target exists, hash remains, and target top is below sticky header
```

Add two special contexts: JavaScript disabled, which must show the full static/noscript trace; and an init script setting `window.IntersectionObserver=undefined`, which must mount exactly once eagerly.

Rendered deterministic values after selecting “她” must equal the core/static values to three decimals. Save screenshots under `EBENCH_AUDIT_DIR` or `/tmp/ebench-f25-audit`.

- [ ] **Step 4: Verify RED**

Run:

```bash
node --test learn/tests/f-2-5-mlp-basics-math.test.mjs learn/tests/f-2-5-mlp-basics-content.test.mjs
node learn/tests/f-2-5-browser-audit.mjs
```

Expected: missing core/widget files and missing rendered controls/styles.

- [ ] **Step 5: Implement the pure UMD math core**

Use the exact matrices from the design spec. Implement `erf` with Abramowitz-Stegun 7.1.26 coefficients, define exact GELU as `x * 0.5 * (1 + erf(x/sqrt(2)))`, and freeze public arrays/objects. The static text calls resulting decimals numerical approximations, not exact values.

- [ ] **Step 6: Implement all four widget views and semantics**

Use a four-button named view group with `type="button"`, `aria-pressed`, ArrowLeft/Right/Up/Down, Home, End, and focus retention. Render into one stable `.mbv-stage[aria-live="polite"]`.

- `linear`: four selectable output columns, each full weighted-sum equation, exactly one `aria-pressed` output.
- `gelu`: labeled range `-3..3 step 0.1`, accessible SVG curve/point, exact-definition note, five-value table, negative-output/non-monotone boundary.
- `mlp`: four flat bands, shape labels, labeled no-GELU checkbox, and qualified affine-collapse comparison.
- `shared`: named token selector, identical parameter display, three traces, dense-layer/MoE caveat, vectorized `[B,n,d]` implementation note.

- [ ] **Step 7: Add complete scoped desktop/mobile CSS in the same task**

Desktop widget rules begin with `.mlp-basics-viz` or `.mlp-basics-viz .mbv-*`. Static rules begin with `body[data-section="f-2-5"] .article .f25-*`. Use existing text/surface/border/accent/interactive/warn variables and explicit `:focus-visible` outlines for every control, including range and checkbox.

Within the existing `@media (max-width:560px)` cascade, make `.f25-flow`, `.mbv-flow`, `.mbv-gelu-layout`, `.mbv-shared-grid`, and weighted-sum equations one column; make `.mbv-view-controls` two columns; make every F-2.5 table a scoped stacked table with accessible visually-hidden headers and `data-label`; allow code/formula/value wrapping; set SVG `width:100%; aspect-ratio:16/10; min-width:0`.

- [ ] **Step 8: Verify GREEN and commit the complete component**

Run:

```bash
node --test learn/tests/f-2-5-mlp-basics-content.test.mjs learn/tests/f-2-5-mlp-basics-math.test.mjs learn/tests/foundations-navigation-integrity.test.mjs learn/tests/f-3-transformer-block-content.test.mjs
node --check learn/assets/js/widgets/mlp-basics-core.js
node --check learn/assets/js/widgets/mlp-basics-viz.js
node learn/tests/f-2-5-browser-audit.mjs
git diff --check HEAD
```

Expected: all tests/audits pass, screenshots exist for every route/theme/viewport, no whitespace errors.

```bash
git add learn/assets/css/book.css learn/assets/js/widgets/mlp-basics-core.js learn/assets/js/widgets/mlp-basics-viz.js learn/chapters/foundations/f-2-5-linear-gelu-mlp.html learn/tests/f-2-5-mlp-basics-content.test.mjs learn/tests/f-2-5-mlp-basics-math.test.mjs learn/tests/f-2-5-browser-audit.mjs
git commit -m "Add interactive Linear GELU MLP experiment"
```

Record Task 2 commit range and exact tests in `.superpowers/sdd/progress.md` after task review is clean.

---

### Task 3: Whole-Branch Review, Integration, Pages, and Task-Owned Cleanup

**Files:**
- Verify all Task 1/2 files.
- Modify only after an observed failing test or review finding.

**Interfaces:**
- Consumes: complete feature commits and permanent local/remote audit.
- Produces: reviewed mainline commits, exact-HEAD successful Pages deployment, and removal only of the feature branch/worktree/processes created by this task.

- [ ] **Step 1: Run fresh full verification over the committed range**

```bash
node --test learn/tests/f-2-5-mlp-basics-content.test.mjs learn/tests/f-2-5-mlp-basics-math.test.mjs learn/tests/foundations-navigation-integrity.test.mjs learn/tests/f-3-transformer-block-content.test.mjs
rg --files learn -g '*.js' | sort | xargs -n1 node --check
node learn/tests/f-2-5-browser-audit.mjs
git diff --check "$BASE_SHA"..HEAD
```

- [ ] **Step 2: Run independent whole-branch review**

Create a review package for `BASE_SHA..HEAD`. Ask a read-only reviewer to check all nine outcomes, mathematical boundaries, semantic anchors, executable math, static/no-JS path, accessibility, four viewports, and unrelated changes. Resolve every Critical/Important finding with a new failing regression test, expected RED, scoped fix, GREEN, and re-review. Do not create an empty polish commit.

- [ ] **Step 3: Integrate without touching unrelated repository state**

Return to the primary checkout. Re-record branch/worktree lists and compare them with the preflight snapshot. Fast-forward `main` to the feature branch only if `main` is still at `BASE_SHA`; otherwise fetch and reconcile without rewriting either history. Remove only `.worktrees/f25-mlp-foundations` and `feature/f25-mlp-foundations` after integration. Do not delete branches/worktrees/processes not created by this task.

- [ ] **Step 4: Push and verify the exact remote SHA**

Use `superpowers:using-github-proxy` with one-shot environment variables and the existing `gh auth git-credential`; never write persistent proxy config. Push `main`, then verify `git ls-remote origin refs/heads/main` equals `git rev-parse HEAD`.

- [ ] **Step 5: Wait for the exact Pages workflow**

Run `gh run list --workflow "Deploy Learning Site" --limit 10 --json databaseId,headSha,status,conclusion,url`, select the run whose `headSha` exactly equals local HEAD into shell variable `RUN_ID`, and wait with `gh run watch "$RUN_ID" --exit-status`. Require successful upload and deploy steps.

- [ ] **Step 6: Re-run the permanent audit against Pages**

With `SHORT_SHA=$(git rev-parse --short HEAD)`, run:

```bash
EBENCH_BASE_URL="https://jandan138.github.io/EBench" EBENCH_CACHE_BUST="$SHORT_SHA" EBENCH_AUDIT_DIR="/tmp/ebench-f25-pages-$SHORT_SHA" node learn/tests/f-2-5-browser-audit.mjs
```

Require both F-2.5 and F-3 200 responses, deployed deterministic values, compatibility fragments, four-view interactions, desktop/mobile layouts, and zero runtime failures.

- [ ] **Step 7: Final task-owned cleanup and evidence**

Confirm no local preview/Playwright process started by the audit remains. Confirm no persistent Git proxy config was added. Final state must show `main` tracking `origin/main` with `0 0` left/right count and no file changes. Branch/worktree state must equal the preflight snapshot except that the task-created feature branch/worktree are absent.

Record final commit SHA, workflow run URL, deployed F-2.5 URL, test counts, screenshot directory, and clean-state commands in the final response.
