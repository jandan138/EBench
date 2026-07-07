# Foundations Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite Part F into an 8-section beginner-friendly Foundations front matter that teaches intuition, shapes, minimal math, checks, and VLA/EBench bridges before later chapters.

**Architecture:** Keep the existing 8 section IDs and file names so navigation and cross-links remain stable. Expand each HTML chapter in place using the existing static-book components (`callout`, `bridge`, `math-block`, `lab`, tables, code blocks), update search keywords in `learn/content.js`, and enhance widgets only where they materially improve comprehension.

**Tech Stack:** Static HTML/CSS/JS under `learn/`; vanilla JavaScript widgets; KaTeX rendered by `learn/assets/js/book.js`; GitHub Pages static deployment.

---

### Task 1: Rewrite The Eight Foundations Chapters

**Files:**
- Modify: `learn/chapters/foundations/f-1-why-transformer.html`
- Modify: `learn/chapters/foundations/f-2-attention.html`
- Modify: `learn/chapters/foundations/f-3-transformer-block.html`
- Modify: `learn/chapters/foundations/f-4-everything-is-token.html`
- Modify: `learn/chapters/foundations/f-5-regression-mse.html`
- Modify: `learn/chapters/foundations/f-6-cross-entropy.html`
- Modify: `learn/chapters/foundations/f-7-gym-action.html`
- Modify: `learn/chapters/foundations/f-8-probability-multimodal.html`

- [ ] Expand each section with the fixed teaching flow: problem scene, intuition, minimal math/shape, worked check, misconception callout, and bridge to later chapters.
- [ ] Preserve each page's `body data-root`, `data-section`, asset paths, previous/next links, and existing title identity.
- [ ] Add concrete formulas and shapes:
  - F-1: `X in R^{n x d}` and RNN path intuition.
  - F-2: `q_i`, `k_i`, `v_i`, `QK^T`, row-wise softmax, mask, weighted sum.
  - F-3: residual block equations, MLP shape, parameter responsibility.
  - F-4: discrete lookup vs continuous projection and multimodal concatenation.
  - F-5: action-chunk MSE and 1D conditional-mean derivation.
  - F-6: logits, softmax, CE/NLL, sequence shape.
  - F-7: Gym/EvalClient loop, action-space shapes, chunk horizon.
  - F-8: `p(A_t | o_t)`, density vs probability, mixture, sampling.

### Task 2: Update Navigation Search Metadata

**Files:**
- Modify: `learn/content.js`

- [ ] Add beginner and paper-term keywords for the expanded sections, including QKV, mask, logits, action chunk, behavior cloning, conditional mean, action tokenization, FAST, Gym, EvalClient, flow matching, density, and multimodal action distribution.
- [ ] Keep existing IDs, titles, and file paths stable.

### Task 3: Enhance Only Necessary Widgets

**Files:**
- Inspect and modify only if needed: `learn/assets/js/widgets/*.js`
- Inspect and modify only if needed: `learn/assets/css/book.css`

- [ ] Prefer current widgets where possible.
- [ ] If widget updates are needed, keep them small, responsive, and compatible with lazy mounting.
- [ ] Avoid dynamic KaTeX inside widgets; keep formal formulas static in chapter HTML.

### Task 4: Verify Static Site Quality

**Commands:**
- [ ] Run a custom Python static check over `learn/**/*.html` and `learn/content.js` to verify referenced chapter files exist, local links resolve, and widget IDs referenced in HTML are registered.
- [ ] Serve `learn/` locally with `python3 -m http.server`.
- [ ] Use a browser or HTTP checks against representative pages: index, F-1, F-2, F-5, F-8.
- [ ] Run `git diff --check`.
- [ ] Run `git status --short`.

### Task 5: Commit, Push, Deploy, Clean Worktree

**Commands:**
- [ ] Run `git diff --stat` and inspect the changed file list.
- [ ] Run `git add` for the plan, Foundations pages, metadata, and any widget/CSS updates.
- [ ] Run `git commit -m "Expand foundations tutorial chapters"`.
- [ ] Run `git push origin main`.
- [ ] Deploy the GitHub Pages site using the repository's existing deployment mechanism. If no build step exists, publish the static `learn/` directory through the configured Pages branch or workflow.
- [ ] Run `git status --short` and confirm the worktree is clean.

### Self-Review

- Spec coverage: the plan covers the user-approved scope: 8-section expansion, beginner scaffolding, frontend consistency, verification, commit/push/deploy, and clean worktree.
- Placeholder scan: no task depends on unspecified future decisions; optional widget edits are explicitly bounded by inspection.
- Type/path consistency: all paths match the existing `learn/` static site layout.
