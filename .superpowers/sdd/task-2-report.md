# Task 2 Report: Complete MLP Experiment Vertical Slice

## Status

Complete. Task 2 implementation commit: `ca2eac4dcdd711a2b35f2ff5bf71af653746c0f0`.
Commit range: `331d730053cf7c1c65946bfd59942f812103ace6..ca2eac4dcdd711a2b35f2ff5bf71af653746c0f0`.

## Plan And Review

The implementation followed the approved static-first design and the controller clarification. The plan was reviewed from architecture, completeness/edge-case, and delivery-risk angles before production edits. Revisions applied were:

- Deep-freeze nested public inputs and parameter arrays, and retain one shared frozen parameter object across traces.
- Keep the static chapter independently sufficient; the widget enhances rather than owns the derivation.
- Assert actual `W1/B1/W2/B2` values and all four numeric Linear 1 weighted sums before changing the chapter.
- Use DOM-state waits for lazy mount and interaction checks, random port allocation, and unconditional browser/server cleanup.
- Treat long KaTeX blocks as intentionally internally scrollable while preventing document, table, widget, and article-bound overflow.

## TDD Evidence

Initial RED command:

```bash
node --test learn/tests/f-2-5-mlp-basics-math.test.mjs learn/tests/f-2-5-mlp-basics-content.test.mjs
```

Observed RED: 4 failures. The core file was missing, the static chapter had no `data-value` trace hooks, and `#mlp-trace` lacked `W1/B1/W2/B2` plus the four numeric weighted sums. After correcting a test-only URL-to-path harness issue, all math failures were confirmed as missing-feature failures.

The browser audit was also written before CSS completion. Its first component-relevant RED exposed missing responsive/interaction behavior after the local KaTeX dependency was made deterministic.

## Implementation

- Added a Node/browser UMD core with Abramowitz-Stegun `erf`, exact-definition `x * Phi(x)` GELU, affine transforms, deterministic traces, formatting, and deeply frozen public tensors.
- Added the static matrices, four Linear 1 equations, four `data-value` vectors, and complete parameterized no-JS fallback to F-2.5.
- Added the registered four-view widget: selectable weighted sums, GELU range/SVG/table, complete MLP/no-GELU comparison, and three-token shared-parameter traces.
- Added named groups, `aria-pressed`, Arrow/Home/End behavior, focus retention, labeled range/checkbox, a concise live region, and accessible SVG labeling.
- Added fully scoped desktop/mobile CSS with 320px one-column flows, two-column view controls, stacked accessible tables, wrapping values, and visible focus outlines.
- Added a permanent Playwright audit using `/tmp/ebench-playwright/node_modules/playwright`, local `127.0.0.1:0`, and `finally` cleanup.

No changes were made to `book.js`, `registry.js`, F-2, F-3, `content.js`, or Task 1 navigation/F-3 tests.

## Verification

Final commands:

```bash
node --test learn/tests/f-2-5-mlp-basics-content.test.mjs learn/tests/f-2-5-mlp-basics-math.test.mjs learn/tests/foundations-navigation-integrity.test.mjs learn/tests/f-3-transformer-block-content.test.mjs
node --check learn/assets/js/widgets/mlp-basics-core.js
node --check learn/assets/js/widgets/mlp-basics-viz.js
node learn/tests/f-2-5-browser-audit.mjs
test "$(find /tmp/ebench-f25-audit -maxdepth 1 -name '*.png' | wc -l)" -eq 16
git diff --check HEAD
```

Results:

- Node tests: 33/33 passed.
- JavaScript syntax checks: passed.
- Browser audit: passed for F-2.5 and F-3 at 1440x900, 834x1112, 390x844, and 320x720 in light and dark themes.
- Special contexts: JavaScript disabled passed; `IntersectionObserver=undefined` eager single mount passed.
- F-3 compatibility fragments, keyboard behavior, deterministic values, overflow, focus/selection contrast, and error capture passed.
- Screenshots: 16 PNGs in `/tmp/ebench-f25-audit`; representative desktop dark and 320px light screenshots were visually reviewed.
- Whitespace check: passed.

## Concerns

- Local audit intercepts the unavailable external Google Fonts and KaTeX CDN with installed audit assets. When `EBENCH_BASE_URL` is set, no interception occurs, so deployment audits still exercise real remote assets.
- GELU uses the required Abramowitz-Stegun numerical `erf`; outputs are approximations to the exact mathematical definition and are tested by tolerance.
