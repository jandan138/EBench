import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium } = require("/tmp/ebench-playwright/node_modules/playwright");
const learnRoot = fileURLToPath(new URL("..", import.meta.url));
const auditDir = process.env.EBENCH_AUDIT_DIR || "/tmp/ebench-f25-audit";
const sizes = [[1440, 900], [834, 1112], [390, 844], [320, 720]];
const themes = ["light", "dark"];
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2" };
let server;
let browser;

async function localServer() {
  server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://localhost");
      let relative = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
      let file = normalize(join(learnRoot, relative));
      assert.ok(file.startsWith(learnRoot));
      if ((await stat(file)).isDirectory()) file = join(file, "index.html");
      response.writeHead(200, { "content-type": mime[extname(file)] || "application/octet-stream" });
      response.end(await readFile(file));
    } catch {
      response.writeHead(404); response.end("Not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

function watch(page) {
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("requestfailed", (request) => { if (request.url().startsWith("http://127.0.0.1")) errors.push(`request: ${request.url()}`); });
  return errors;
}

async function provideLocalKatex(context) {
  if (process.env.EBENCH_BASE_URL) return;
  await context.route("https://fonts.googleapis.com/**", (route) => route.fulfill({ contentType: "text/css", body: "" }));
  await context.route("https://fonts.gstatic.com/**", (route) => route.fulfill({ contentType: "font/woff2", body: Buffer.alloc(0) }));
  const files = {
    "katex.min.css": ["text/css", "/tmp/ebench-cdn/katex.min.css"],
    "katex.min.js": ["text/javascript", "/tmp/ebench-cdn/katex.min.js"],
    "auto-render.min.js": ["text/javascript", "/tmp/ebench-cdn/auto-render.min.js"],
  };
  await context.route("https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/**", async (route) => {
    const name = new URL(route.request().url()).pathname.split("/").pop();
    const entry = files[name];
    if (!entry) return route.fulfill({ contentType: "font/woff2", body: Buffer.alloc(0) });
    await route.fulfill({ contentType: entry[0], body: await readFile(entry[1]) });
  });
}

async function noOverflow(page) {
  return page.evaluate(() => {
    const selectors = ["html", ".f25-mobile-stack", ".mlp-basics-viz"];
    const failures = selectors.flatMap((selector) => [...document.querySelectorAll(selector)].filter((el) => el.scrollWidth > el.clientWidth + 2).map(() => selector));
    const article = document.querySelector(".article").getBoundingClientRect();
    if (article.left < -2 || article.right > document.documentElement.clientWidth + 2) failures.push(".article-bounds");
    return failures;
  });
}

try {
  await mkdir(auditDir, { recursive: true });
  const base = (process.env.EBENCH_BASE_URL || await localServer()).replace(/\/$/, "");
  browser = await chromium.launch({ headless: true });
  for (const [width, height] of sizes) {
    for (const theme of themes) {
      const context = await browser.newContext({ viewport: { width, height }, ignoreHTTPSErrors: true });
      await provideLocalKatex(context);
      await context.addInitScript((value) => localStorage.setItem("ebook-theme", value), theme);
      const page = await context.newPage();
      const errors = watch(page);
      const response = await page.goto(`${base}/chapters/foundations/f-2-5-linear-gelu-mlp.html`, { waitUntil: "networkidle" });
      assert.equal(response.status(), 200);
      assert.ok(await page.locator(".katex").count(), "KaTeX did not render");
      assert.equal(await page.locator(".math-block").count(), await page.locator(".math-block:has(.katex)").count(), "reader-visible math block remained raw");
      assert.equal(await page.locator('[data-widget="mlp-basics-viz"]').getAttribute("data-mounted"), null, "widget mounted before intersection");
      await page.locator('[data-widget="mlp-basics-viz"]').scrollIntoViewIfNeeded();
      await page.locator('[data-widget="mlp-basics-viz"][data-mounted="1"]').waitFor();
      assert.equal(await page.locator(".mbv-view-controls > .mbv-view-button").count(), 4);
      await page.evaluate(() => scrollTo(0, 0));
      await page.locator('[data-widget="mlp-basics-viz"]').scrollIntoViewIfNeeded();
      assert.equal(await page.locator(".mbv-view-controls > .mbv-view-button").count(), 4, "widget remounted");
      const viewButtons = page.locator(".mbv-view-button");
      for (let index = 0; index < 4; index += 1) {
        await viewButtons.nth(index).click();
        assert.equal(await page.locator('.mbv-view-button[aria-pressed="true"]').count(), 1);
        assert.equal(await viewButtons.nth(index).evaluate((el) => el === document.activeElement), true);
      }
      await viewButtons.nth(0).focus();
      for (const key of ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "End", "Home", "Enter", "Space"]) await page.keyboard.press(key);
      await viewButtons.nth(0).click();
      for (const output of await page.locator(".mbv-output").all()) { await output.click(); assert.equal(await page.locator('.mbv-output[aria-pressed="true"]').count(), 1); }
      await viewButtons.nth(1).click();
      const range = page.getByLabel("GELU 输入");
      const before = await page.locator("#mbv-gelu-output").textContent();
      await range.fill("1.5");
      assert.notEqual(await page.locator("#mbv-gelu-output").textContent(), before);
      assert.ok((await page.locator(".mbv-stage").getAttribute("aria-label"))?.length < 80);
      assert.ok(await page.locator(".mbv-gelu-svg[aria-label]").count());
      await viewButtons.nth(2).click(); await page.getByLabel("去掉 GELU").check();
      await viewButtons.nth(3).click();
      for (const token of await page.locator(".mbv-token").all()) { await token.click(); assert.equal(await page.locator('.mbv-token[aria-pressed="true"]').count(), 1); }
      await page.getByRole("button", { name: "她", exact: true }).click();
      assert.match(await page.locator(".mbv-shared-output").textContent(), /\[0\.614, 1\.529\]/);
      assert.deepEqual(await noOverflow(page), []);
      if (width === 320) {
        assert.equal(await page.locator(".mbv-view-controls").evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length), 2);
        assert.equal(await page.locator(".mbv-shared-grid").evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length), 1);
      }
      await viewButtons.nth(0).focus();
      const focusStyle = await page.evaluate(() => ({ width: getComputedStyle(document.querySelector(".mbv-view-button:focus")).outlineWidth, selected: getComputedStyle(document.querySelector('.mbv-view-button[aria-pressed="true"]')).backgroundColor, normal: getComputedStyle(document.querySelector('.mbv-view-button[aria-pressed="false"]')).backgroundColor }));
      assert.notEqual(focusStyle.width, "0px"); assert.notEqual(focusStyle.selected, focusStyle.normal);
      await page.screenshot({ path: join(auditDir, `f25-${width}x${height}-${theme}.png`), fullPage: true });
      const f3 = await page.goto(`${base}/chapters/foundations/f-3-transformer-block.html`, { waitUntil: "networkidle" });
      assert.equal(f3.status(), 200); assert.ok(await page.locator(".katex").count());
      await page.screenshot({ path: join(auditDir, `f3-${width}x${height}-${theme}.png`), fullPage: true });
      assert.deepEqual(errors, []);
      await context.close();
    }
  }
  for (const hash of ["attention-params", "mlp", "residual-ln", "full-flow", "shared-mlp", "mlp-expressivity"]) {
    const page = await browser.newPage(); await page.goto(`${base}/chapters/foundations/f-3-transformer-block.html#${hash}`);
    assert.equal(await page.locator(`#${hash}`).count(), 1); assert.equal(new URL(page.url()).hash, `#${hash}`);
    assert.ok(await page.locator(`#${hash}`).evaluate((el) => el.getBoundingClientRect().top >= 50)); await page.close();
  }
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const noJsPage = await noJs.newPage(); await noJsPage.goto(`${base}/chapters/foundations/f-2-5-linear-gelu-mlp.html`);
  const fallback = await noJsPage.locator(".f25-noscript").textContent();
  for (const marker of ["Linear 1", "GELU", "Linear 2", "W1", "B1", "W2", "B2"]) assert.ok(fallback.includes(marker));
  await noJs.close();
  const eager = await browser.newContext(); await eager.addInitScript(() => { window.IntersectionObserver = undefined; });
  const eagerPage = await eager.newPage(); await eagerPage.goto(`${base}/chapters/foundations/f-2-5-linear-gelu-mlp.html`);
  await eagerPage.locator('[data-widget="mlp-basics-viz"][data-mounted="1"]').waitFor(); assert.equal(await eagerPage.locator(".mbv-view-controls").count(), 1); await eager.close();
  console.log(`F-2.5 browser audit passed; screenshots: ${auditDir}`);
} finally {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
}
