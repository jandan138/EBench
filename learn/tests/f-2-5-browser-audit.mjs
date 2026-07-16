import assert from "node:assert/strict";
import { access, mkdir, readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("/tmp/ebench-playwright/node_modules/playwright");
const learnRoot = fileURLToPath(new URL("..", import.meta.url));
const auditDir = process.env.EBENCH_AUDIT_DIR || "/tmp/ebench-foundations-audit";
const remoteBase = (process.env.EBENCH_BASE_URL || "").replace(/\/$/, "");
const routes = [
  ["/chapters/foundations/f-2-25-multi-head-attention.html", "f225"],
  ["/chapters/foundations/f-2-5-linear-gelu-mlp.html", "f25"],
  ["/chapters/foundations/f-2-6-activation-gates.html", "f26"],
  ["/chapters/foundations/f-3-transformer-block.html", "f3"],
];
const viewports = [
  { label: "desktop", width: 1440, height: 900 },
  { label: "tablet", width: 834, height: 1112 },
  { label: "mobile", width: 390, height: 844 },
];
const themes = ["light", "dark"];
const mime = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".woff2": "font/woff2",
};

let server;
let browser;

async function localServer() {
  server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url, "http://127.0.0.1");
      const relative = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "") || "index.html";
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
  return "http://127.0.0.1:" + server.address().port;
}

async function resolveKatexCache() {
  const candidates = [process.env.EBENCH_KATEX_CACHE_DIR, "/tmp/ebench-cdn", "/tmp/ebench-katex-cache"].filter(Boolean);
  const names = ["katex.min.css", "katex.min.js", "auto-render.min.js"];
  for (const directory of candidates) {
    try {
      await Promise.all(names.map((name) => access(join(directory, name))));
      return directory;
    } catch {
      // Try the next shared cache. Remote previews use the CDN normally.
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
    return route.fulfill({ contentType: entry[0], body: await readFile(entry[1]) });
  });
}

function watch(page, baseOrigin) {
  const errors = [];
  const sameOrigin = (url) => {
    try {
      return new URL(url).origin === baseOrigin;
    } catch {
      return false;
    }
  };
  page.on("console", (message) => {
    if (message.type() === "error") errors.push("console: " + message.text());
  });
  page.on("pageerror", (error) => errors.push("page: " + error.message));
  page.on("requestfailed", (request) => {
    if (sameOrigin(request.url())) errors.push("request: " + request.url() + " (" + (request.failure()?.errorText || "failed") + ")");
  });
  page.on("response", (response) => {
    if (sameOrigin(response.url()) && response.status() >= 400) errors.push("response: " + response.status() + " " + response.url());
  });
  return errors;
}

async function scrollPage(page) {
  await page.evaluate(async () => {
    const stop = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
    for (let y = 0; y <= stop; y += Math.max(Math.floor(window.innerHeight * 0.75), 1)) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    window.scrollTo(0, 0);
  });
}

async function assertReaderLayout(page, label) {
  const metrics = await page.evaluate(() => {
    const article = document.querySelector(".article");
    const h1 = document.querySelector("h1");
    const rawMath = article.textContent.includes("$$") || article.textContent.includes("\\[");
    const tooWide = [...document.querySelectorAll(".article .katex-display, .article table, .article pre, .article svg")]
      .filter((element) => element.getBoundingClientRect().width > element.parentElement.getBoundingClientRect().width + 1)
      .map((element) => element.className || element.tagName);
    return {
      articleHeight: article.getBoundingClientRect().height,
      h1Height: h1.getBoundingClientRect().height,
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      rawMath,
      tooWide,
    };
  });
  assert.ok(metrics.articleHeight > 400, label + ": article is unexpectedly empty");
  assert.ok(metrics.h1Height > 0, label + ": heading is not visible");
  assert.equal(metrics.overflow, false, label + ": document has horizontal overflow");
  assert.equal(metrics.rawMath, false, label + ": reader-visible raw LaTeX remains");
  assert.deepEqual(metrics.tooWide, [], label + ": a math/table/code/figure element overflows its parent");
}

async function auditRoute(base, path, routeLabel, viewport, theme, cacheDir) {
  const context = await browser.newContext({
    colorScheme: theme,
    viewport: { width: viewport.width, height: viewport.height },
  });
  await provideLocalKatex(context, cacheDir);
  const page = await context.newPage();
  const errors = watch(page, new URL(base).origin);
  const response = await page.goto(base + path, { waitUntil: "networkidle" });
  assert.equal(response.status(), 200, routeLabel + ": HTTP status");
  await page.waitForFunction(() => document.querySelectorAll(".article .katex").length > 0, null, { timeout: 10000 });
  await scrollPage(page);
  await assertReaderLayout(page, routeLabel + " " + viewport.label + " " + theme);
  await page.screenshot({ path: join(auditDir, routeLabel + "-" + viewport.label + "-" + theme + ".png"), fullPage: true });
  assert.deepEqual(errors, [], routeLabel + " " + viewport.label + " " + theme + ": runtime/request failures");
  await context.close();
}

async function assertAnchor(base, path, fragment, expectedHeading, cacheDir, canonicalPath = null) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await provideLocalKatex(context, cacheDir);
  const page = await context.newPage();
  const response = await page.goto(base + path + "#" + fragment, { waitUntil: "networkidle" });
  assert.equal(response.status(), 200);
  if (canonicalPath) {
    await page.waitForFunction((expected) => window.location.pathname === expected, canonicalPath, { timeout: 10000 });
  }
  await page.locator("#" + fragment).waitFor({ state: "attached" });
  await page.locator(expectedHeading).waitFor();
  const visible = await page.locator(expectedHeading).evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const headerBottom = document.querySelector(".topbar").getBoundingClientRect().bottom;
    return bounds.bottom > headerBottom && bounds.top < window.innerHeight;
  });
  assert.ok(visible, path + "#" + fragment + ": explanatory heading is not visible");
  await context.close();
}

async function assertWidgetsAndBridges(base, cacheDir) {
  const context = await browser.newContext({ viewport: { width: 834, height: 1112 } });
  await provideLocalKatex(context, cacheDir);

  const f25 = await context.newPage();
  await f25.goto(base + "/chapters/foundations/f-2-5-linear-gelu-mlp.html", { waitUntil: "networkidle" });
  const f25Widget = f25.locator('[data-widget="mlp-basics-viz"]');
  assert.equal(await f25Widget.count(), 1);
  await f25Widget.scrollIntoViewIfNeeded();
  await f25.locator(".mbv-view-button").first().waitFor();
  await f25.locator(".mbv-view-button").nth(2).click();

  const f26 = await context.newPage();
  await f26.goto(base + "/chapters/foundations/f-2-6-activation-gates.html", { waitUntil: "networkidle" });
  const f26Widget = f26.locator('[data-widget="activation-gates-viz"]');
  assert.equal(await f26Widget.count(), 1);
  await f26Widget.scrollIntoViewIfNeeded();
  await f26.locator(".agv-view-button").first().waitFor();
  await f26.locator('.agv-view-button[data-view="threshold"]').click();
  assert.equal(await f26.locator("#agv-input").count(), 1);
  await f26.locator('a[href="f-3-transformer-block.html#full-flow"]').first().click();
  await f26.waitForLoadState("networkidle");
  assert.equal(new URL(f26.url()).hash, "#full-flow");
  assert.equal(await f26.locator("#full-flow").count(), 1);

  const f3 = await context.newPage();
  await f3.goto(base + "/chapters/foundations/f-3-transformer-block.html#recap", { waitUntil: "networkidle" });
  const f3Widget = f3.locator('[data-widget="transformer-block-viz"]');
  assert.equal(await f3Widget.count(), 1);
  await f3Widget.scrollIntoViewIfNeeded();
  await f3.locator(".tbv-view-button").first().waitFor();
  await f3.locator('.tbv-view-button[data-view="norm"]').click();
  assert.equal(await f3.locator(".tbv-norm-row").count(), 3);
  await f3.locator('a[href="f-2-6-activation-gates.html#preactivation"]').last().click();
  await f3.waitForLoadState("networkidle");
  assert.equal(new URL(f3.url()).hash, "#preactivation");
  assert.equal(await f3.locator("#preactivation").count(), 1);

  await context.close();
}

async function assertNoJsFallbacks(base, cacheDir) {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 720 } });
  await provideLocalKatex(context, cacheDir);
  const f25 = await context.newPage();
  await f25.goto(base + "/chapters/foundations/f-2-5-linear-gelu-mlp.html", { waitUntil: "domcontentloaded" });
  assert.equal(await f25.locator(".f25-noscript").count(), 1);
  assert.match((await f25.locator(".f25-noscript").textContent()), /Linear 1.*GELU.*Linear 2/);
  const f26 = await context.newPage();
  await f26.goto(base + "/chapters/foundations/f-2-6-activation-gates.html", { waitUntil: "domcontentloaded" });
  assert.equal(await f26.locator(".activation-gates-static").count(), 1);
  assert.equal(await f26.locator(".agv-channel-table tbody tr").count(), 4);
  await context.close();
}

try {
  await mkdir(auditDir, { recursive: true });
  const base = remoteBase || await localServer();
  const cacheDir = await resolveKatexCache();
  browser = await chromium.launch({ headless: true });

  for (const [path, label] of routes) {
    for (const viewport of viewports) {
      for (const theme of themes) {
        await auditRoute(base, path, label, viewport, theme, cacheDir);
      }
    }
  }

  await assertAnchor(base, "/chapters/foundations/f-2-5-linear-gelu-mlp.html", "preactivation", "#preactivation", cacheDir, "/chapters/foundations/f-2-6-activation-gates.html");
  await assertAnchor(base, "/chapters/foundations/f-2-6-activation-gates.html", "preactivation", "#preactivation", cacheDir);
  await assertAnchor(base, "/chapters/foundations/f-3-transformer-block.html", "full-flow", "#full-flow", cacheDir);
  await assertWidgetsAndBridges(base, cacheDir);
  await assertNoJsFallbacks(base, cacheDir);
  process.stdout.write("Foundations browser audit passed. Screenshots: " + auditDir + "\n");
} finally {
  await browser?.close();
  await new Promise((resolve) => server?.close(resolve) || resolve());
}
