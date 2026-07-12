import assert from "node:assert/strict";
import { access, mkdir, readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("/tmp/ebench-playwright/node_modules/playwright");
const learnRoot = fileURLToPath(new URL("..", import.meta.url));
const auditDir = process.env.EBENCH_AUDIT_DIR || "/tmp/ebench-f25-audit";
const remoteBase = process.env.EBENCH_BASE_URL;
const cacheBust = (process.env.EBENCH_CACHE_BUST || "").trim();
const cacheBustParam = "ebench-cache-bust";
const sizes = [[1440, 900], [834, 1112], [390, 844], [320, 720]];
const themes = ["light", "dark"];
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2" };
const f25Path = "/chapters/foundations/f-2-5-linear-gelu-mlp.html";
const f3Path = "/chapters/foundations/f-3-transformer-block.html";
let server;
let browser;
const routedRequests = new WeakMap();

async function localServer() {
  server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://localhost");
      const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
      let file = normalize(join(learnRoot, relative));
      assert.ok(file.startsWith(learnRoot));
      if ((await stat(file)).isDirectory()) file = join(file, "index.html");
      response.writeHead(200, { "content-type": mime[extname(file)] || "application/octet-stream" });
      response.end(await readFile(file));
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

function isSameOrigin(url, baseOrigin) {
  try {
    return new URL(url).origin === baseOrigin;
  } catch {
    return false;
  }
}

function withCacheBust(rawUrl, baseOrigin, value = cacheBust) {
  if (!value || !isSameOrigin(rawUrl, baseOrigin)) return rawUrl;
  const url = new URL(rawUrl);
  url.searchParams.set(cacheBustParam, value);
  return url.toString();
}

function watch(page, baseOrigin) {
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("requestfailed", (request) => {
    if (isSameOrigin(request.url(), baseOrigin)) errors.push(`request: ${request.url()} (${request.failure()?.errorText || "failed"})`);
  });
  page.on("response", (response) => {
    if (isSameOrigin(response.url(), baseOrigin) && response.status() >= 400) errors.push(`response: ${response.status()} ${response.url()}`);
  });
  return errors;
}

async function resolveKatexCache() {
  const candidates = [process.env.EBENCH_KATEX_CACHE_DIR, "/tmp/ebench-cdn", "/tmp/ebench-katex-cache"].filter(Boolean);
  const names = ["katex.min.css", "katex.min.js", "auto-render.min.js"];
  for (const directory of candidates) {
    try {
      await Promise.all(names.map((name) => access(join(directory, name))));
      return directory;
    } catch {
      // An incomplete or absent cache is ignored; the audit uses the real CDN.
    }
  }
  return null;
}

async function provideLocalKatex(context, cacheDir) {
  if (remoteBase || !cacheDir) return;
  await context.route("https://fonts.googleapis.com/**", (route) => route.fulfill({ contentType: "text/css", body: "" }));
  await context.route("https://fonts.gstatic.com/**", (route) => route.fulfill({ contentType: "font/woff2", body: Buffer.alloc(0) }));
  const files = {
    "katex.min.css": ["text/css", join(cacheDir, "katex.min.css")],
    "katex.min.js": ["text/javascript", join(cacheDir, "katex.min.js")],
    "auto-render.min.js": ["text/javascript", join(cacheDir, "auto-render.min.js")],
  };
  await context.route("https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/**", async (route) => {
    const name = new URL(route.request().url()).pathname.split("/").pop();
    const entry = files[name];
    if (!entry) return route.fulfill({ contentType: "font/woff2", body: Buffer.alloc(0) });
    await route.fulfill({ contentType: entry[0], body: await readFile(entry[1]) });
  });
}

async function installCacheBust(context, baseOrigin) {
  const routed = [];
  routedRequests.set(context, routed);
  if (!cacheBust) return;
  await context.route("**/*", (route) => {
    const request = route.request();
    const originalUrl = request.url();
    const eligible = ["GET", "HEAD"].includes(request.method()) && isSameOrigin(originalUrl, baseOrigin);
    const url = eligible ? withCacheBust(originalUrl, baseOrigin) : originalUrl;
    routed.push({ url, originalUrl, method: request.method(), type: request.resourceType() });
    return route.fallback(eligible ? { url } : undefined);
  });
}

async function prepareContext(context, baseOrigin, cacheDir) {
  await provideLocalKatex(context, cacheDir);
  await installCacheBust(context, baseOrigin);
}

async function collectLayoutFailures(page) {
  return page.evaluate(() => {
    const selectors = [
      "html", "body", "article", "[data-widget]", ".f25-stage", ".mbv-stage", ".mbv-band",
      ".tbv-panel", ".tbv-stages", ".tbv-op", "table", ".math-block", "code", "pre",
    ];
    const viewportWidth = document.documentElement.clientWidth;
    const failures = [];
    const visible = (element) => {
      const style = getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden" && style.visibility !== "collapse";
    };
    const descriptor = (element) => {
      const id = element.id ? `#${element.id}` : "";
      const classes = [...element.classList].slice(0, 2).map((name) => `.${name}`).join("");
      return `${element.tagName.toLowerCase()}${id}${classes}`;
    };
    const scrollsX = (element) => ["auto", "scroll"].includes(getComputedStyle(element).overflowX);
    const protectedByScroller = (element) => {
      for (let node = element; node && node !== document.documentElement; node = node.parentElement) {
        if (scrollsX(node) && node.scrollWidth > node.clientWidth + 2) {
          const bounds = node.getBoundingClientRect();
          return bounds.left >= -2 && bounds.right <= viewportWidth + 2;
        }
      }
      return false;
    };

    for (const selector of selectors) {
      for (const element of document.querySelectorAll(selector)) {
        if (!visible(element)) continue;
        const bounds = element.getBoundingClientRect();
        const hasContent = element === document.documentElement || element === document.body || element.textContent.trim() || element.children.length;
        if (hasContent && (bounds.width <= 0 || bounds.height <= 0)) failures.push(`${descriptor(element)} zero-size ${bounds.width}x${bounds.height}`);
        if ((bounds.left < -2 || bounds.right > viewportWidth + 2) && !protectedByScroller(element)) {
          failures.push(`${descriptor(element)} viewport-bounds ${bounds.left.toFixed(1)}..${bounds.right.toFixed(1)}/${viewportWidth}`);
        }
        const overflowX = getComputedStyle(element).overflowX;
        const leakingChildren = [...element.querySelectorAll("*")].filter((child) => {
          if (!visible(child)) return false;
          const boundsTarget = child.closest("svg") || child;
          const childBounds = boundsTarget.getBoundingClientRect();
          const childStyle = getComputedStyle(boundsTarget);
          if (childStyle.position === "fixed" && childStyle.transform !== "none" && (childBounds.right <= 0 || childBounds.left >= viewportWidth)) return false;
          return (childBounds.left < -2 || childBounds.right > viewportWidth + 2) && !protectedByScroller(boundsTarget);
        });
        if (element.scrollWidth > element.clientWidth + 2 && !scrollsX(element)
          && (["hidden", "clip"].includes(overflowX) || element === document.documentElement || element === document.body || leakingChildren.length)) {
          const wide = [...element.querySelectorAll("*")].filter((child) => child.scrollWidth > child.clientWidth + 2)
            .slice(0, 16).map((child) => `${descriptor(child)}:${child.clientWidth}/${child.scrollWidth}`).join(",");
          failures.push(`${descriptor(element)} overflow ${element.clientWidth}/${element.scrollWidth} overflow-x=${overflowX}${leakingChildren.length ? ` leak=${descriptor(leakingChildren[0])}` : ""}${wide ? ` wide=${wide}` : ""}`);
        }
      }
    }
    return [...new Set(failures)];
  });
}

async function assertLayout(page, label) {
  assert.deepEqual(await collectLayoutFailures(page), [], `${label} layout failures`);
}

async function assertGrid(page, selector, expected, label) {
  const tracks = await page.locator(selector).evaluateAll((elements) => elements.filter((element) => {
    const style = getComputedStyle(element);
    return style.display === "grid" && style.visibility !== "hidden";
  }).map((element) => getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length));
  assert.ok(tracks.length, `${label}: no visible ${selector} grid`);
  assert.deepEqual(tracks, tracks.map(() => expected), `${label}: ${selector} tracks`);
}

async function assertSingleColumnFlex(page, selector, label) {
  const layouts = await page.locator(selector).evaluateAll((elements) => elements.filter((element) => {
    const style = getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden";
  }).map((element) => {
    const style = getComputedStyle(element);
    return { display: style.display, direction: style.flexDirection, wrap: style.flexWrap };
  }));
  assert.ok(layouts.length, `${label}: no visible ${selector}`);
  assert.deepEqual(layouts, layouts.map(() => ({ display: "flex", direction: "column", wrap: "nowrap" })), `${label}: ${selector} must be a one-column flex flow`);
}

async function assertHttp200(page, url) {
  const response = await page.goto(url, { waitUntil: "networkidle" });
  assert.ok(response, `no navigation response for ${url}`);
  assert.equal(response.status(), 200, url);
}

async function assertMath(page, label) {
  assert.ok(await page.locator(".katex").count(), `${label}: KaTeX did not render`);
  assert.equal(await page.locator(".math-block").count(), await page.locator(".math-block:has(.katex)").count(), `${label}: reader-visible math remained raw`);
}

async function collectRawMathDelimiters(page) {
  return page.locator("article").evaluate((article) => {
    const ignored = "script, style, code, pre, .katex";
    const delimiter = /(?:\$\$|\\\[|\\\]|\\\(|\\\)|(?<!\\)\$(?!\$))/g;
    const isVisible = (element) => {
      for (let node = element; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse") return false;
      }
      return element.getClientRects().length > 0;
    };
    const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
    const failures = [];
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || parent.closest(ignored) || !isVisible(parent)) continue;
      for (const match of node.textContent.matchAll(delimiter)) {
        failures.push(`${match[0]} in ${parent.tagName.toLowerCase()}: ${node.textContent.trim().slice(0, 100)}`);
      }
    }
    return failures;
  });
}

async function assertNoRawMath(page, label) {
  assert.deepEqual(await collectRawMathDelimiters(page), [], `${label}: reader-visible raw math delimiters`);
}

async function assertFocused(page, locator, label) {
  assert.equal(await locator.evaluate((element) => element === document.activeElement), true, `${label}: focus moved`);
  const style = await locator.evaluate((element) => {
    const computed = getComputedStyle(element);
    return { width: parseFloat(computed.outlineWidth), style: computed.outlineStyle, color: computed.outlineColor };
  });
  assert.ok(style.width > 0 && style.style !== "none" && !/rgba?\(0, 0, 0, 0\)/.test(style.color), `${label}: no visible focus ${JSON.stringify(style)}`);
}

async function assertStatusChange(status, action, expected, label) {
  const before = (await status.textContent()).trim();
  await action();
  const after = (await status.textContent()).trim();
  assert.notEqual(after, before, `${label}: status did not change`);
  assert.match(after, expected, `${label}: unexpected status`);
  assert.ok(after.length > 0 && after.length < 80, `${label}: status is not concise (${after.length})`);
  return after;
}

async function assertButtonStateDifference(page, selectedSelector, normalSelector, label) {
  const states = await page.evaluate(([selected, normal]) => {
    const snapshot = (element) => {
      const style = getComputedStyle(element);
      return [style.backgroundColor, style.borderColor, style.borderWidth, style.color].join("|");
    };
    return [snapshot(document.querySelector(selected)), snapshot(document.querySelector(normal))];
  }, [selectedSelector, normalSelector]);
  assert.notEqual(states[0], states[1], `${label}: selected and normal states look identical`);
}

async function assertSelectedAndFocused(page, locator, selectedSelector, label) {
  assert.equal(await page.locator(selectedSelector).count(), 1, `${label}: selected count`);
  assert.equal(await locator.getAttribute("aria-pressed"), "true", `${label}: expected selected control`);
  assert.equal(await locator.evaluate((element) => element === document.activeElement), true, `${label}: focus moved`);
}

async function activateNative(page, locator, key, selectedSelector, label) {
  await locator.focus();
  await page.keyboard.press(key);
  await assertSelectedAndFocused(page, locator, selectedSelector, `${label} ${key}`);
  await assertFocused(page, locator, `${label} ${key}`);
}

async function auditF25(page, width, label) {
  await assertMath(page, label);
  await assertNoRawMath(page, label);
  const widget = page.locator('[data-widget="mlp-basics-viz"]');
  assert.equal(await widget.getAttribute("data-mounted"), null, `${label}: widget mounted before intersection`);
  await assertLayout(page, `${label} static`);
  await widget.scrollIntoViewIfNeeded();
  await page.locator('[data-widget="mlp-basics-viz"][data-mounted="1"]').waitFor();
  assert.equal(await page.locator(".mbv-view-controls > .mbv-view-button").count(), 4);
  await page.locator(".mbv-view-controls").evaluate((element) => { element.dataset.auditIdentity = "original"; });
  await page.evaluate(() => scrollTo(0, 0));
  await widget.scrollIntoViewIfNeeded();
  assert.equal(await page.locator('.mbv-view-controls[data-audit-identity="original"] > .mbv-view-button').count(), 4, `${label}: widget remounted after re-entry`);

  const viewButtons = page.locator(".mbv-view-button");
  const status = page.locator('.mbv-status[role="status"]');
  assert.equal(await status.count(), 1, `${label}: dedicated status count`);
  assert.equal(await status.getAttribute("aria-live"), "polite", `${label}: status politeness`);
  assert.equal(await status.getAttribute("aria-atomic"), "true", `${label}: status atomicity`);
  assert.equal(await page.locator(".mbv-stage").getAttribute("aria-live"), null, `${label}: stage must not be live`);
  await assertStatusChange(status, () => viewButtons.nth(1).click(), /GELU.*视图/, `${label} view status`);
  await viewButtons.nth(0).click();
  await assertStatusChange(status, () => page.locator(".mbv-output").nth(1).click(), /Linear 1.*y2.*-2\.000/, `${label} Linear output status`);

  for (let index = 0; index < 4; index += 1) {
    await viewButtons.nth(index).click();
    await assertSelectedAndFocused(page, viewButtons.nth(index), '.mbv-view-button[aria-pressed="true"]', `${label} view ${index}`);
    await assertLayout(page, `${label} view ${index}`);
  }
  await assertButtonStateDifference(page, '.mbv-view-button[aria-pressed="true"]', '.mbv-view-button[aria-pressed="false"]', `${label} views`);

  const keyCases = [["ArrowRight", 1], ["ArrowDown", 1], ["ArrowLeft", 3], ["ArrowUp", 3], ["Home", 0], ["End", 3]];
  for (const [key, expected] of keyCases) {
    await viewButtons.nth(0).click();
    await page.keyboard.press(key);
    await assertSelectedAndFocused(page, viewButtons.nth(expected), '.mbv-view-button[aria-pressed="true"]', `${label} ${key}`);
    await assertFocused(page, viewButtons.nth(expected), `${label} ${key}`);
  }
  await activateNative(page, viewButtons.nth(1), "Enter", '.mbv-view-button[aria-pressed="true"]', `${label} view`);
  await activateNative(page, viewButtons.nth(2), "Space", '.mbv-view-button[aria-pressed="true"]', `${label} view`);

  await viewButtons.nth(0).click();
  const outputs = page.locator(".mbv-output");
  for (let index = 0; index < await outputs.count(); index += 1) {
    await activateNative(page, outputs.nth(index), index % 2 ? "Space" : "Enter", '.mbv-output[aria-pressed="true"]', `${label} output ${index + 1}`);
  }
  await assertButtonStateDifference(page, '.mbv-output[aria-pressed="true"]', '.mbv-output[aria-pressed="false"]', `${label} outputs`);
  if (width === 320) await assertGrid(page, ".mbv-output-group", 1, label);

  await viewButtons.nth(1).click();
  const range = page.getByRole("slider", { name: "GELU 输入", exact: true });
  const before = await page.locator("#mbv-gelu-output").textContent();
  await range.focus();
  const rangeNormal = await range.screenshot();
  await page.keyboard.press("ArrowRight");
  await assertFocused(page, range, `${label} range`);
  assert.notEqual(await page.locator("#mbv-gelu-output").textContent(), before, `${label}: range did not update output`);
  assert.equal(Buffer.compare(rangeNormal, await range.screenshot()) === 0, false, `${label}: range value has no visible state change`);
  await assertStatusChange(status, () => range.fill("1.5"), /GELU.*1\.500.*1\.400/, `${label} GELU status`);
  assert.match(await page.locator("#mbv-gelu-input").textContent(), /1\.500/);
  assert.ok(await page.locator(".mbv-gelu-svg[aria-label]").count(), `${label}: SVG lacks accessible label`);
  if (width === 320) await assertGrid(page, ".mbv-gelu-layout", 1, label);

  await viewButtons.nth(2).click();
  const checkbox = page.locator(".mbv-no-gelu");
  const mlpOutput = page.locator(".mbv-flow .mbv-band:last-child code");
  assert.equal((await mlpOutput.textContent()).trim(), "[0.614, 1.529]", `${label}: initial GELU output`);
  await checkbox.focus();
  const unchecked = await checkbox.screenshot();
  await assertStatusChange(status, () => page.keyboard.press("Space"), /去掉 GELU.*\[0\.450, 2\.000\]/, `${label} no-GELU status`);
  assert.equal(await checkbox.isChecked(), true, `${label}: checkbox did not toggle`);
  assert.equal((await mlpOutput.textContent()).trim(), "[0.450, 2.000]", `${label}: no-GELU output`);
  await assertFocused(page, checkbox, `${label} checkbox`);
  assert.equal(Buffer.compare(unchecked, await checkbox.screenshot()) === 0, false, `${label}: checkbox states look identical`);
  await assertStatusChange(status, () => page.keyboard.press("Space"), /保留 GELU.*\[0\.614, 1\.529\]/, `${label} restored GELU status`);
  assert.equal(await checkbox.isChecked(), false, `${label}: checkbox did not toggle off`);
  assert.equal((await mlpOutput.textContent()).trim(), "[0.614, 1.529]", `${label}: restored GELU output`);
  if (width === 320) await assertGrid(page, ".mbv-flow", 1, label);

  await viewButtons.nth(3).click();
  if (width === 320) await assertSingleColumnFlex(page, ".mbv-token-trace .mbv-flow", label);
  const tokens = page.locator(".mbv-token");
  for (let index = 0; index < await tokens.count(); index += 1) {
    await activateNative(page, tokens.nth(index), index % 2 ? "Space" : "Enter", '.mbv-token[aria-pressed="true"]', `${label} token ${index + 1}`);
  }
  await assertStatusChange(status, () => tokens.nth(1).click(), /喜欢.*\[0\.805, -0\.634\]/, `${label} token status`);
  await assertButtonStateDifference(page, '.mbv-token[aria-pressed="true"]', '.mbv-token[aria-pressed="false"]', `${label} tokens`);
  await tokens.nth(0).click();
  assert.match(await page.locator(".mbv-shared-output").textContent(), /\[0\.614, 1\.529\]/);
  await assertLayout(page, `${label} final`);

  if (width === 320) {
    await assertGrid(page, ".f25-flow", 1, label);
    await assertGrid(page, ".f25-weighted-sums", 1, label);
    await assertGrid(page, ".mbv-view-controls", 2, label);
    await assertGrid(page, ".mbv-shared-grid", 1, label);
  }
}

async function auditF3(page, width, label) {
  await assertMath(page, label);
  await assertNoRawMath(page, label);
  const widget = page.locator('[data-widget="transformer-block-viz"]');
  await widget.scrollIntoViewIfNeeded();
  await page.locator('[data-widget="transformer-block-viz"][data-mounted="1"]').waitFor();
  const buttons = page.locator(".tbv-view-button");
  assert.equal(await buttons.count(), 4, `${label}: F-3 view count`);
  for (let index = 0; index < 4; index += 1) {
    await buttons.nth(index).click();
    await assertLayout(page, `${label} view ${index}`);
    if (width === 320) {
      await assertGrid(page, ".tbv-controls", 2, label);
      const oneColumn = [".tbv-stages", ".tbv-bypasses", ".tbv-mlp-row", ".tbv-routes", ".tbv-norm-row"];
      for (const selector of oneColumn) {
        if (await page.locator(selector).count()) await assertGrid(page, selector, 1, label);
      }
      if (await page.locator(".tbv-tensor").count()) await assertGrid(page, ".tbv-tensor", 2, label);
    }
  }
}

async function newAuditedPage(context, baseOrigin) {
  const page = await context.newPage();
  const requests = [];
  page.on("request", (request) => requests.push({ url: request.url(), method: request.method(), type: request.resourceType() }));
  return { page, errors: watch(page, baseOrigin), requests, routed: routedRequests.get(context) || requests };
}

function assertCacheBustCoverage(requests, baseOrigin, label) {
  if (!cacheBust) return;
  const sameOrigin = requests.filter(({ url, method }) => ["GET", "HEAD"].includes(method) && isSameOrigin(url, baseOrigin));
  assert.ok(sameOrigin.some(({ type }) => type === "document"), `${label}: no document request observed`);
  assert.ok(sameOrigin.some(({ type }) => type === "stylesheet"), `${label}: no same-origin stylesheet observed`);
  assert.ok(sameOrigin.some(({ type }) => type === "script"), `${label}: no same-origin script observed`);
  for (const request of sameOrigin) {
    assert.equal(new URL(request.url).searchParams.get(cacheBustParam), cacheBust, `${label}: missing cache key on ${request.type} ${request.url}`);
  }
  const cdn = requests.filter(({ url }) => new URL(url).hostname === "cdn.jsdelivr.net");
  assert.ok(cdn.length, `${label}: no jsDelivr request observed`);
  for (const request of cdn) {
    assert.equal(new URL(request.url).searchParams.has(cacheBustParam), false, `${label}: rewrote cross-origin CDN ${request.url}`);
  }
}

async function controlledAssertions(baseOrigin) {
  assert.equal(isSameOrigin(`${baseOrigin}/asset.js`, baseOrigin), true);
  assert.equal(isSameOrigin("https://audit.example/asset.js", "https://audit.example"), true);
  assert.equal(isSameOrigin("https://other.example/asset.js", "https://audit.example"), false);
  assert.equal(isSameOrigin("https://cdn.jsdelivr.net/asset.js", baseOrigin), false);
  assert.equal(isSameOrigin("not a url", baseOrigin), false);
  const controlledValue = "controlled-key";
  const localUrl = new URL(withCacheBust(`${baseOrigin}/asset.js?lang=zh#part`, baseOrigin, controlledValue));
  assert.equal(localUrl.searchParams.get("lang"), "zh");
  assert.equal(localUrl.searchParams.get(cacheBustParam), controlledValue);
  assert.equal(localUrl.hash, "#part");
  assert.equal(withCacheBust("https://cdn.jsdelivr.net/asset.js", baseOrigin, controlledValue), "https://cdn.jsdelivr.net/asset.js");
  const context = await browser.newContext({ viewport: { width: 320, height: 720 } });
  const page = await context.newPage();
  await page.setContent('<article><div class="math-block" style="width:100px;overflow-x:auto"><code style="display:block;width:300px">allowed overflow</code></div><table style="display:block;width:100px;overflow-x:hidden"><tbody><tr><td style="display:block;width:300px">clipped</td></tr></tbody></table></article>');
  const failures = await collectLayoutFailures(page);
  assert.ok(failures.some((failure) => failure.includes("table") && failure.includes("overflow")), "controlled layout check missed clipped overflow");
  assert.equal(failures.some((failure) => failure.includes("math-block") && failure.includes("overflow")), false, "controlled layout check rejected explicit scrolling");
  await page.setContent('<article><p>Rendered prose</p><pre>Intentional source $x$</pre><code>Intentional source $$x$$</code><span class="katex">Rendered KaTeX source \\(x\\)</span><script>const source = "\\\\(x\\\\)";</script><style>.source::before { content: "\\\\[x\\\\]"; }</style></article>');
  const rawMathFixtures = [
    { name: "dollar", text: "Visible raw $x+y$ fixture", delimiter: "$" },
    { name: "display-dollar", text: "Visible raw $$x+y$$ fixture", delimiter: "$$" },
    { name: "parenthesis", text: String.raw`Visible raw \(x+y\) fixture`, delimiter: String.raw`\(` },
    { name: "bracket", text: String.raw`Visible raw \[x+y\] fixture`, delimiter: String.raw`\[` },
  ];
  await page.locator("article").evaluate((article, fixtures) => {
    for (const fixture of fixtures) {
      const element = document.createElement("p");
      element.dataset.auditRaw = fixture.name;
      element.textContent = fixture.text;
      article.append(element);
    }
  }, rawMathFixtures);
  const rawFailures = await collectRawMathDelimiters(page);
  const missing = rawMathFixtures.filter((fixture) => !rawFailures.some((failure) => failure.startsWith(`${fixture.delimiter} in p`))).map((fixture) => fixture.name);
  assert.deepEqual(missing, [], `controlled raw math fixtures were not detected: ${missing.join(", ")}`);
  await page.locator("[data-audit-raw]").evaluateAll((elements) => elements.forEach((element) => element.remove()));
  await assertNoRawMath(page, "controlled raw-inline fixture removed");
  await context.close();
}

try {
  await mkdir(auditDir, { recursive: true });
  const base = (remoteBase || await localServer()).replace(/\/$/, "");
  const baseOrigin = new URL(base).origin;
  const cacheDir = remoteBase ? null : await resolveKatexCache();
  browser = await chromium.launch({ headless: true });
  await controlledAssertions(baseOrigin);

  for (const [width, height] of sizes) {
    for (const theme of themes) {
      const context = await browser.newContext({ viewport: { width, height }, ignoreHTTPSErrors: true });
      await prepareContext(context, baseOrigin, cacheDir);
      await context.addInitScript((value) => localStorage.setItem("ebook-theme", value), theme);

      const f25 = await newAuditedPage(context, baseOrigin);
      await assertHttp200(f25.page, `${base}${f25Path}`);
      assertCacheBustCoverage(f25.routed, baseOrigin, `F-2.5 ${width}x${height} ${theme}`);
      await auditF25(f25.page, width, `F-2.5 ${width}x${height} ${theme}`);
      await f25.page.screenshot({ path: join(auditDir, `f25-${width}x${height}-${theme}.png`), fullPage: true });
      assert.deepEqual(f25.errors, [], `F-2.5 ${width}x${height} ${theme} runtime/request failures`);
      await f25.page.close();

      const f3 = await newAuditedPage(context, baseOrigin);
      await assertHttp200(f3.page, `${base}${f3Path}`);
      await auditF3(f3.page, width, `F-3 ${width}x${height} ${theme}`);
      await f3.page.screenshot({ path: join(auditDir, `f3-${width}x${height}-${theme}.png`), fullPage: true });
      assert.deepEqual(f3.errors, [], `F-3 ${width}x${height} ${theme} runtime/request failures`);
      await context.close();
    }
  }

  for (const hash of ["attention-params", "mlp", "residual-ln", "full-flow", "shared-mlp", "mlp-expressivity"]) {
    const context = await browser.newContext();
    await prepareContext(context, baseOrigin, cacheDir);
    const { page, errors } = await newAuditedPage(context, baseOrigin);
    await assertHttp200(page, `${base}${f3Path}#${hash}`);
    assert.equal(await page.locator(`#${hash}`).count(), 1);
    assert.equal(new URL(page.url()).hash, `#${hash}`);
    if (["shared-mlp", "mlp-expressivity"].includes(hash)) {
      const landing = await page.locator("#mlp").evaluate((heading) => {
        const headerBottom = document.querySelector(".topbar").getBoundingClientRect().bottom;
        const content = heading.nextElementSibling.getBoundingClientRect();
        const residualTop = document.querySelector("#residual-ln").getBoundingClientRect().top;
        const bounds = heading.getBoundingClientRect();
        return { headingTop: bounds.top, contentTop: content.top, headerBottom, residualTop };
      });
      assert.ok(landing.headingTop >= landing.headerBottom, `${hash}: #mlp heading hidden by sticky header`);
      assert.ok(landing.contentTop >= landing.headerBottom, `${hash}: #mlp content hidden by sticky header`);
      assert.ok(landing.headingTop < landing.residualTop, `${hash}: navigation landed on Residual instead of #mlp`);
    } else {
      assert.ok(await page.locator(`#${hash}`).evaluate((element) => element.getBoundingClientRect().top >= 50), `${hash}: target hidden by sticky header`);
    }
    assert.deepEqual(errors, [], `${hash}: runtime/request failures`);
    await context.close();
  }

  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 720 } });
  await prepareContext(noJs, baseOrigin, cacheDir);
  for (const [path, label] of [[f25Path, "no-JS F-2.5"], [f3Path, "no-JS F-3"]]) {
    const { page, errors } = await newAuditedPage(noJs, baseOrigin);
    await assertHttp200(page, `${base}${path}`);
    await assertLayout(page, label);
    if (path === f25Path) {
      const fallback = await page.locator(".f25-noscript").textContent();
      for (const marker of ["Linear 1", "GELU", "Linear 2", "W1", "B1", "W2", "B2"]) assert.ok(fallback.includes(marker), `${label}: missing ${marker}`);
    }
    assert.deepEqual(errors, [], `${label}: runtime/request failures`);
    await page.close();
  }
  await noJs.close();

  const eager = await browser.newContext({ viewport: { width: 320, height: 720 } });
  await prepareContext(eager, baseOrigin, cacheDir);
  await eager.addInitScript(() => {
    delete window.IntersectionObserver;
    window.__mlpMountCalls = 0;
    window.EBWidgets = new Proxy({}, {
      set(target, property, value) {
        target[property] = property === "mlp-basics-viz" ? function (...args) {
          window.__mlpMountCalls += 1;
          return value(...args);
        } : value;
        return true;
      },
    });
  });
  const eagerAudit = await newAuditedPage(eager, baseOrigin);
  await assertHttp200(eagerAudit.page, `${base}${f25Path}`);
  await eagerAudit.page.locator('[data-widget="mlp-basics-viz"][data-mounted="1"]').waitFor();
  assert.equal(await eagerAudit.page.evaluate(() => window.__mlpMountCalls), 1, "eager mount count after load");
  assert.equal(await eagerAudit.page.locator(".mbv-view-controls").count(), 1, "eager controls after load");
  await assertMath(eagerAudit.page, "eager F-2.5");
  await assertLayout(eagerAudit.page, "eager F-2.5");
  await eagerAudit.page.locator(".mbv-view-controls").evaluate((element) => { element.dataset.auditIdentity = "eager-original"; });
  await eagerAudit.page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await eagerAudit.page.evaluate(() => scrollTo(0, 0));
  await eagerAudit.page.locator('[data-widget="mlp-basics-viz"]').scrollIntoViewIfNeeded();
  assert.equal(await eagerAudit.page.evaluate(() => window.__mlpMountCalls), 1, "eager widget mounted again after re-entry");
  assert.equal(await eagerAudit.page.locator('.mbv-view-controls[data-audit-identity="eager-original"]').count(), 1, "eager controls replaced after re-entry");
  assert.deepEqual(eagerAudit.errors, [], "eager F-2.5 runtime/request failures");
  await eager.close();

  console.log(`F-2.5/F-3 browser audit passed; screenshots: ${auditDir}; KaTeX: ${cacheDir ? `cache ${cacheDir}` : "network"}`);
} finally {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
}
