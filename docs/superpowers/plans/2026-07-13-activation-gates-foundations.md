# Activation Gates Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Upgrade F-2.5 so a beginner can understand pre-activation signs, ReLU/GELU gating, bias thresholds, training direction, and negative-information handling before returning to the Transformer Block chapter.

**Architecture:** Keep the existing static Linear/GELU/MLP lesson and its MLP experiment. Extend the pure UMD math core with deterministic activation-gate helpers, insert a staged static lesson after `#linear-boundaries`, and add one separate four-view activation-gates experiment only after all static explanations at `#negative-information`. F-3 gets one concise back-link only.

**Tech Stack:** Static HTML, book.css, vanilla JavaScript/UMD, EBWidgets, KaTeX 0.16.9, Node node:test, Playwright Chromium 1.61.1.

## Global Constraints

- Keep F-2.5 at learn/chapters/foundations/f-2-5-linear-gelu-mlp.html. Do not renumber F-3 through F-8.
- Preserve all existing F-2.5 IDs and F-3 public anchors. Insert new F-2.5 IDs in this order: preactivation, sign-is-not-meaning, bias-threshold, relu, gelu, training-gates, negative-information, why-nonlinearity.
- Treat z=w^T x+b as a pre-activation and signed learned score. Do not call it a strict geometric projection unless normalization and bias conditions are stated.
- State that z sign is not useful/useless, correct/incorrect, or a fixed named feature. Loss and training select a useful parameterization.
- ReLU is max(0,z). Its central role is piecewise nonlinearity; gating and sparsity are related properties. State that strictly negative z has zero derivative and explain dead-ReLU risk.
- GELU is z Phi(z), acts elementwise, can retain negative outputs, and has a probability-style derivation without runtime sampling or literal feature-probability claims.
- State `GELU'(z)=Phi(z)+z phi(z)` and distinguish it from the strict ReLU derivative: ReLU has derivative 0 for z<0, and no mathematical derivative at z=0 (framework subgradient convention).
- State explicitly that `(w,b) -> (-w,-b)` flips z but gives a complementary ReLU gate, not an equivalent ReLU. Do not describe a raw affine score as a strict projection unless its extra conditions hold.
- The actual gradient trace uses x=1, target=1, w=-0.4, b=0, learning rate 0.5, loss 0.5*(GELU(wx+b)-target)^2. Its z values are approximately [-0.400, -0.176, 0.213, 0.797, 1.177].
- Explain that an irrelevant positive response need not be driven negative; the loss can reduce it toward zero or change downstream weights. Use target=0, initial w=0.8, b=0 as the deterministic counterexample.
- Explain ReLU(z)-ReLU(-z)=z as an expressiveness example, not a promise that training allocates paired units. Mention the Transformer residual stream bypasses the MLP branch.
- Give the paired construction precisely: `z=w^T x+b`, opposite channel `(-w)^T x+(-b)=-z`, and second-Linear coefficients `+1,-1`. State that a residual bypass does not make the whole model invertible or guarantee no information loss.
- Channel examples must be derived, not literals: frozen `CHANNEL_INPUT=[1,1]`, `CHANNEL_W=[[1,-1,0.5,-2],[1.1,0.3,0.8,-1.2]]`, and zero bias produce `[2.1,-0.7,1.3,-3.2]` through the shared `affine` helper.
- Keep an exact one-to-one `data-answers` mapping for user questions 1--26. Static content must precede its interactive equivalent; no-JS must expose every result the widget teaches.
- Preserve the role boundary: `.mlp-basics-viz` explains one real 2->4->2 MLP trace; `activation-gates-viz` explains sign asymmetry, thresholds, complementary channels, and toy training.
- Do not modify learn/assets/js/book.js or learn/assets/js/widgets/registry.js, add dependencies, or introduce unscoped f25/agv CSS selectors.
- Static HTML and noscript remain sufficient; interaction never supplies the only explanation.
- Every change follows RED, observed expected failure, minimal GREEN, and regression verification.

---

### Task 1: Activation-Gate Math Contract and Static Teaching Path

**Files:**

- Modify: learn/tests/f-2-5-mlp-basics-content.test.mjs
- Modify: learn/tests/f-2-5-mlp-basics-math.test.mjs
- Modify: learn/assets/js/widgets/mlp-basics-core.js
- Modify: learn/chapters/foundations/f-2-5-linear-gelu-mlp.html
- Modify: learn/content.js
- Modify: learn/chapters/foundations/f-3-transformer-block.html

**Interfaces:**

- EBMLPBasics/CommonJS gains pure relu(value), normalCdf(value), normalPdf(value), geluDerivative(value), gate(input, weight, bias), pairedRelu(z), channelTrace(), and trainingTrace(initialWeight, initialBias, target, steps, learningRate).
- gate returns frozen input, weight, bias, z, relu, and gelu values.
- pairedRelu returns frozen z, positive, opposite, and reconstructed values.
- channelTrace derives the four pre-activations from frozen `CHANNEL_INPUT`, `CHANNEL_W`, and `CHANNEL_B` through `affine`, and returns frozen channel rows.
- trainingTrace returns frozen rows containing step, input, target, learningRate, weight, bias, z, activation, dLossDz, dLossDw, and dLossDb before each update.

- [ ] **Step 1: Write failing content-contract tests**

Add section-local tests that extract only one named h2 section. The test contract is:

~~~js
const required = [
  ["preactivation", ["pre-activation", "z=w^T x+b", "hidden state", "激活后的数值"]],
  ["sign-is-not-meaning", ["不是", "有用", "无用", "符号", "学习到的方向"]],
  ["bias-threshold", ["ReLU(x-3)", "x>3", "w^T x+b=0", "方向", "位置"]],
  ["relu", ["ReLU(z)=max(0,z)", "分段非线性", "稀疏", "导数", "dead ReLU"]],
  ["gelu", ["GELU(x)=x\\Phi(x)", "不是", "抽样", "负输出"]],
  ["training-gates", ["Loss", "反向传播", "不是人工", "-0.400", "0.213"]],
  ["negative-information", ["ReLU(z)-ReLU(-z)=z", "residual stream", "负权重", "不等于"]],
];
~~~

Require every new ID once and before why-nonlinearity. Require `activation-gates-viz` after `#negative-information`, not between static sections. Add `data-answers` to the seven section headings and assert the unique parsed answer IDs are exactly `[1,2,...,26]`. Extend checkpoints with unique outcome-10 through outcome-17. Require F-2.5 metadata terms relu, pre-activation, bias, gate, dead relu. Require one F-3 recap link to the new preactivation anchor and no second F-3 MLP derivation.

The section contracts must include the following accuracy markers, not merely vocabulary matches: affine-score-versus-projection limitation; sign-flip non-equivalence; ReLU's `z=0` subgradient caveat; an active-sample/Leaky-ReLU route around dead units; GELU's expected stochastic-gate interpretation without runtime sampling; exact paired weights/biases and `+1,-1` reconstruction; GELU negative output followed by negative downstream weight; residual-bypass-not-invertibility; distributed-feature and loss-indirectness boundaries.

- [ ] **Step 2: Write failing pure-math tests**

Add numerical and immutability tests before changing the UMD core.

~~~js
assert.equal(core.relu(-0.7), 0);
assert.equal(core.relu(2.1), 2.1);
assert.equal(core.gate(3, 1, -3).z, 0);
assert.ok(Math.abs(core.gate(3.1, 1, -3).relu - 0.1) < 1e-12);
for (const z of [-2.5, 0, 3]) assert.ok(Math.abs(core.pairedRelu(z).reconstructed - z) < 1e-12);
assert.ok(Math.abs(core.geluDerivative(-0.4) - 0.197270) < 1e-6);
assert.deepEqual(core.trainingTrace(-0.4, 0, 1, 5).map((row) => core.format(row.z)), ["-0.400", "-0.176", "0.213", "0.797", "1.177"]);
assert.deepEqual(core.trainingTrace(0.8, 0, 0, 5).map((row) => core.format(row.z)), ["0.800", "0.157", "0.102", "0.070", "0.049"]);
assert.deepEqual(core.channelTrace().map((row) => row.z), [2.1, -0.7, 1.3, -3.2]);
~~~

Assert every returned row/object is frozen, and prove the channel values came from the exported frozen fixture instead of duplicated literals. Assert the first relevant `dLossDz`, `dLossDw`, and `dLossDb` have the expected signs and the next z increases; assert the first irrelevant values have the opposite sign and the next z decreases. Assert the GELU derivative numerically. Exercise w=0 and negative-w threshold behavior. Run the same API in CommonJS and a VM browser-like `window`, and assert equivalent names/results.

- [ ] **Step 3: Verify RED**

Run:

~~~bash
node --test learn/tests/f-2-5-mlp-basics-content.test.mjs learn/tests/f-2-5-mlp-basics-math.test.mjs
~~~

Expected: missing section IDs/markers and missing core functions, not syntax errors.

- [ ] **Step 4: Implement minimal pure helpers**

Extend mlp-basics-core.js without DOM references.

~~~js
function normalCdf(value) { return 0.5 * (1 + erf(value / Math.sqrt(2))); }
function normalPdf(value) { return Math.exp(-0.5 * value * value) / Math.sqrt(2 * Math.PI); }
function relu(value) { return Math.max(0, value); }
function geluDerivative(value) { return normalCdf(value) + value * normalPdf(value); }
function gate(input, weight, bias) {
  const z = input * weight + bias;
  return Object.freeze({ input, weight, bias, z, relu: relu(z), gelu: gelu(z) });
}
function pairedRelu(z) {
  const positive = relu(z), opposite = relu(-z);
  return Object.freeze({ z, positive, opposite, reconstructed: positive - opposite });
}
~~~

Implement `channelTrace` from the exported frozen fixture and existing `affine`, never with independently copied channel z literals. Implement `trainingTrace` by recording a frozen row and then applying `weight -= learningRate*dLossDw` and `bias -= learningRate*dLossDb`, where `dLossDz=(gelu(z)-target)*geluDerivative(z)`, `dLossDw=input*dLossDz`, and `dLossDb=dLossDz`. Export every helper through the existing frozen API.

- [ ] **Step 5: Implement static learning path and narrow F-3 bridge**

Insert the seven new F-2.5 sections after linear-boundaries and before GELU/nonlinearity. Explain z before using response. Use the derived `[2.1,-0.7,1.3,-3.2]` channel scores and explicitly say signs are not semantic labels. Add the documented `data-answers` attributes so the 26 questions have exact, stable primary anchors.

Use a static ReLU(x-3) table with x 2, 3, 4 and outputs 0, 0, 1. Include w^T x+b=0 as high-dimensional boundary. In relu, use separate short paragraphs titled in prose by 分段非线性, 门控, and 稀疏性, plus the strict-negative derivative/dead-ReLU caveat.

Keep the current GELU table/curve. Add its probability-style derivation boundary and a static f25-mobile-stack comparison table for z -2,-1,0,1,2, ReLU, and GELU.

In training-gates, show relevant trace columns z/GELU/dL/dz/dL/dw/dL/db/next z. Call it a scalar regression teaching toy and explain why x=1 makes dL/dw and dL/db numerically equal only in this toy. Show the independent irrelevant trace tends to low response rather than necessarily negative z. In negative-information, derive ReLU(z)-ReLU(-z)=z from the paired weights/biases and second-linear coefficients, show a numerical GELU(-1) times a later negative weight gives a positive contribution, then explain that a residual stream bypass is not an invertibility guarantee.

Change content.js title to Linear、ReLU/GELU 与 MLP 从零开始 and add five new search terms. Add only one F-3 recap link to preactivation.

- [ ] **Step 6: Verify GREEN and commit**

~~~bash
node --test learn/tests/f-2-5-mlp-basics-content.test.mjs learn/tests/f-2-5-mlp-basics-math.test.mjs learn/tests/f-3-transformer-block-content.test.mjs
node --check learn/assets/js/widgets/mlp-basics-core.js
git diff --check
git add learn/tests/f-2-5-mlp-basics-content.test.mjs learn/tests/f-2-5-mlp-basics-math.test.mjs learn/assets/js/widgets/mlp-basics-core.js learn/chapters/foundations/f-2-5-linear-gelu-mlp.html learn/content.js learn/chapters/foundations/f-3-transformer-block.html
git commit -m "Deepen activation gate foundations"
~~~

Expected: all tests pass and the core remains browser-mount independent.

---

### Task 2: Accessible Activation-Gates Experiment and Responsive Audit

**Files:**

- Create: learn/assets/js/widgets/activation-gates-viz.js
- Create: learn/tests/activation-gates-viz.test.mjs
- Modify: learn/chapters/foundations/f-2-5-linear-gelu-mlp.html
- Modify: learn/assets/css/book.css
- Modify: learn/tests/f-2-5-browser-audit.mjs
- Modify: .github/workflows/deploy-learning-site.yml

**Interfaces:**

- activation-gates-viz.js registers EBWidgets["activation-gates-viz"] after mlp-basics-core.js and before book.js.
- It renders four buttons with data-view values channels, threshold, pair, training. Exactly one is aria-pressed true.
- It consumes window.EBMLPBasics and never redefines GELU, ReLU, thresholds, pairs, or training arithmetic.

- [ ] **Step 1: Write failing widget/source-contract tests**

Create activation-gates-viz.test.mjs. It must fail because the widget does not exist.

~~~js
assert.ok(existsSync(widgetPath));
assert.match(chapter, /data-widget="activation-gates-viz"/);
assert.ok(chapter.indexOf("mlp-basics-core.js") < chapter.indexOf("activation-gates-viz.js"));
assert.ok(chapter.indexOf("activation-gates-viz.js") < chapter.indexOf("book.js"));
assert.match(widget, /EBWidgets\["activation-gates-viz"\]/);
["channels", "threshold", "pair", "training"].forEach((view) => assert.ok(widget.includes('data-view: "' + view + '"')));
assert.match(widget, /aria-pressed/);
assert.match(widget, /aria-live/);
assert.match(widget, /keydown/);
assert.match(css, /\.activation-gates-viz/);
~~~

Also assert F-2.5 static selectors remain `body[data-section="f-2-5"] .article` scoped, no top-level `.agv-*` selector is present, and every widget selector begins `.activation-gates-viz` (with `.agv-*` only beneath it). Assert the static `#gelu`/MLP lab caption distinguishes the existing MLP trace from the activation-gates lab.

- [ ] **Step 2: Extend permanent browser audit before implementation**

Leave existing mlp-basics-viz checks intact. Add an independent activation sequence after lazy mount.

~~~text
scroll activation widget into view and wait for data-mounted=1
assert four agv-view-button controls, one agv-status role=status, one pressed view
for every view: click, assert focus and one pressed button, then assert no layout failure
exercise ArrowRight, ArrowLeft, Home, End, Enter, Space
channels: assert z 2.100, -0.700, 1.300, -3.200 and matching ReLU/GELU values
threshold: independently vary x, w, and b; x=4,w=1,b=-3 gives z 1.000/ReLU 1.000; x=2,w=1,b=-3 gives z -1.000/ReLU 0.000; assert a visible w=0 explanation and a negative-w state
pair: z=-2.5 reconstructs -2.500 and non-guarantee text exists
training: relevant z increases across rows; irrelevant z decreases toward zero
320px: agv-view-controls has two columns; agv-grid/agv-trace one column
no-JS: static source content visibly provides the four derived channel values and their ReLU/GELU results, the ReLU(x-3) table, paired reconstruction, both training traces, and their ordered explanations without a widget mount
IntersectionObserver fallback: each widget name mounts exactly once
~~~

Add activation lab selectors to collectLayoutFailures. Require browser globals `window.EBMLPBasics` and `window.EBMLPBasics.channelTrace` before mount. Capture a desktop and 320px screenshot after every activation view. Preserve remote/proxy/cache-bust behavior and current F-3 fragment checks; additionally click the F-3 recap link, require the exact F-2.5 `#preactivation` target to be unique, visible, and not obscured.

- [ ] **Step 3: Verify RED**

~~~bash
node --test learn/tests/activation-gates-viz.test.mjs
node learn/tests/f-2-5-browser-audit.mjs
~~~

Expected: missing widget/script/style and missing activation controls.

- [ ] **Step 4: Implement the four-view widget**

Add a static-first lab after negative-information with a lab title 正负响应怎样经过门控 and data-widget activation-gates-viz. Its caption says the four views reuse pure calculations and do not give channels fixed human semantics. Do not remove the pre-existing MLP lab's GELU slider; distinguish their teaching roles in both captions and source contracts.

Use the MLP widget keyboard navigation pattern with agv classes and one concise agv-status role=status live region.

- channels: derived core channel values and ReLU/GELU outputs, with signs-not-useful/useless note.
- threshold: labelled x, w, b ranges; initialize x=3, w=1, b=-3 to demonstrate `ReLU(x-3)`, show z and ReLU, and state the w=0/negative-w boundary behavior.
- pair: labelled z range -3..3 step 0.1, show ReLU(z), ReLU(-z), reconstructed z, and non-guarantee text.
- training: relevant/irrelevant selectors, frozen core traces, target, and update rule. Do not claim it trains a model live.

- [ ] **Step 5: Implement scoped responsive styling**

Use existing accent, interactive, warn, surface, surface-2, border, and ink-soft tokens. Use one continuous flow surface inside lab, not nested decorative cards. Give every button/range visible focus-visible outline. Scope every rule under `.activation-gates-viz`; static F-2.5 fixes remain under `body[data-section="f-2-5"] .article`.

At max-width 560px, set activation-gates-viz view controls to two equal columns; agv-grid, agv-threshold-layout, agv-pair-layout, and agv-trace to one column; numeric values to min-width 0, overflow-wrap anywhere, white-space normal. Retain accessible visually-hidden static table headers.

- [ ] **Step 6: Add a deployment verification gate**

Update `.github/workflows/deploy-learning-site.yml` with a `verify` job that runs before deploy. It checks out the exact commit, installs the Node version used by the repository, runs the targeted Node tests and JavaScript syntax checks, and makes the deploy job `needs: verify`. Do not add a brittle browser/Playwright install to Pages CI; the browser audit remains a required local and deployed release gate. Add a source-contract test that deploy depends on verification.

- [ ] **Step 7: Verify GREEN and commit**

~~~bash
node --test learn/tests/activation-gates-viz.test.mjs learn/tests/f-2-5-mlp-basics-content.test.mjs learn/tests/f-2-5-mlp-basics-math.test.mjs learn/tests/f-3-transformer-block-content.test.mjs
node --check learn/assets/js/widgets/activation-gates-viz.js
node learn/tests/f-2-5-browser-audit.mjs
git diff --check
git add learn/assets/js/widgets/activation-gates-viz.js learn/tests/activation-gates-viz.test.mjs learn/chapters/foundations/f-2-5-linear-gelu-mlp.html learn/assets/css/book.css learn/tests/f-2-5-browser-audit.mjs .github/workflows/deploy-learning-site.yml
git commit -m "Add activation gate teaching experiment"
~~~

Expected: all static, math, widget, browser, no-JS, fallback, responsive, and F-3 checks pass.

---

### Task 3: Review, Integration, Deployment, and Task-Owned Cleanup

**Files:**

- Verify all Task 1 and Task 2 files.
- Modify only after a failing regression test or accepted review finding.

**Interfaces:**

- Consumes: the feature branch beginning at f81a734 and its reviewed commits.
- Produces: verified main, exact-SHA Pages deployment, and removal of only this task's feat/foundations-mlp-primer worktree/branch.

- [ ] **Step 1: Run full local verification**

~~~bash
node --test learn/tests/f-2-5-mlp-basics-content.test.mjs learn/tests/f-2-5-mlp-basics-math.test.mjs learn/tests/activation-gates-viz.test.mjs learn/tests/f-3-transformer-block-content.test.mjs
rg --files learn -g '*.js' | sort | xargs -n1 node --check
node learn/tests/f-2-5-browser-audit.mjs
git diff --check f81a734..HEAD
~~~

Require zero failures and screenshots for every activation view at desktop and 320px plus the existing viewport/theme set. Re-run tests after any review fix; do not treat a reviewer report as verification.

- [ ] **Step 2: Run independent whole-branch review**

Create a review package for f81a734..HEAD. Dispatch a read-only reviewer with the design spec and this plan. It checks every accuracy constraint, strict-ReLU versus GELU training distinction, nonsemantic sign language, no fake fixed-neuron semantics, static/no-JS equivalence, accessibility, mobile layout, F-3 scope, and unrelated changes. Resolve every Critical or Important finding through a focused RED test, smallest fix, GREEN, and re-review.

- [ ] **Step 3: Integrate and preserve user state**

Before integration, inspect `git config --show-origin --get-regexp 'http.*proxy'` and use the approved one-shot proxy environment to run `git ls-remote origin main` and `git fetch origin main`. Require `origin/main` to be an ancestor of the release candidate before fast-forwarding main. If it is not, reconcile in a dedicated integration worktree without rewriting history or reverting user work, then repeat full verification. Remove only `.worktrees/foundations-mlp-primer` and branch `feat/foundations-mlp-primer` after a confirmed integration. Do not run `git clean`.

- [ ] **Step 4: Push and deploy exact HEAD**

Use one-shot GitHub proxy variables with existing gh auth credentials. Do not persist proxy configuration. Push main, verify remote SHA equals local HEAD, locate Deploy Learning Site by exact head SHA, and require a successful `gh run watch`. Confirm the verify job and deploy job both pass for that SHA.

- [ ] **Step 5: Audit deployed Pages and finish cleanly**

~~~bash
SHORT_SHA=$(git rev-parse --short HEAD)
EBENCH_BASE_URL="https://jandan138.github.io/EBench" EBENCH_CACHE_BUST="$SHORT_SHA" EBENCH_AUDIT_DIR="/tmp/ebench-activation-pages-$SHORT_SHA" node learn/tests/f-2-5-browser-audit.mjs
~~~

Require F-2.5/F-3 HTTP 200, all new interactions, 1440/834/390/320 layouts, formula rendering, F-3 recap fragment target, and zero runtime failures. Finally prove main and origin have left/right count 0 0, the worktree is clean, no task-owned process remains, and no persistent Git proxy configuration was added.
