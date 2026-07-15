import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import vm from "node:vm";

const learnRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const contentSource = readFileSync(new URL("../content.js", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(contentSource, sandbox);
const flat = sandbox.window.EBOOK.flat;
const localReference = /(?:href|src)\s*=\s*(["'])(.*?)\1/g;
const references = (source) => [...source.matchAll(localReference)].map((match) => match[2]);

const resolveReference = (sourceFile, reference) => {
  const url = new URL(reference, `https://ebook.local/${sourceFile}`);
  return {
    file: resolve(learnRoot, `.${decodeURIComponent(url.pathname)}`),
    fragment: decodeURIComponent(url.hash.slice(1)),
  };
};

const isLocal = (reference) => !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(reference);

test("formal navigation registers the unique F-2 -> F-2.25 -> F-2.5 -> F-3 path", () => {
  assert.equal(flat.length, 63);
  assert.equal(new Set(flat.map((section) => section.id)).size, flat.length);
  assert.equal(new Set(flat.map((section) => section.file)).size, flat.length);
  flat.forEach((section) => assert.ok(existsSync(resolve(learnRoot, section.file)), `missing registered file ${section.file}`));
  const f2 = flat.findIndex((section) => section.id === "f-2");
  const f225 = flat.findIndex((section) => section.id === "f-2-25");
  const f25 = flat.findIndex((section) => section.id === "f-2-5");
  const f3 = flat.findIndex((section) => section.id === "f-3");
  assert.equal(f2 + 1, f225);
  assert.equal(f225 + 1, f25);
  assert.equal(f25 + 1, f3);
});

test("registered chapters have resolvable local assets, links, and fragments", () => {
  flat.forEach(({ file }) => {
    const source = readFileSync(resolve(learnRoot, file), "utf8");
    for (const reference of references(source)) {
      if (!isLocal(reference)) continue;
      const target = resolveReference(file, reference);
      assert.ok(target.file.startsWith(`${learnRoot}/`), `${file} escapes learn/: ${reference}`);
      assert.ok(existsSync(target.file), `${file} has missing local reference ${reference}`);
      if (target.fragment) {
        const targetSource = readFileSync(target.file, "utf8");
        const fragment = target.fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        assert.match(targetSource, new RegExp(`(?:id|name)="${fragment}"`), `${file} has missing fragment ${reference}`);
      }
    }
  });
});

test("navigation parsing accepts single-quoted and double-quoted local attributes", () => {
  const fixture = '<a href=\'fixtures/single.html#single\'></a><img src="fixtures/double.svg" />';
  assert.deepEqual(references(fixture), ["fixtures/single.html#single", "fixtures/double.svg"]);
});

test("F-2 routes the attention output projection through F-2.25 before F-2.5", () => {
  const f2 = readFileSync(resolve(learnRoot, "chapters/foundations/f-2-attention.html"), "utf8");
  ["start", "output-projection"].forEach((fragment) => {
    assert.match(f2, new RegExp(`href="f-2-25-multi-head-attention\\.html#${fragment}"`));
  });
  ["residual-ln", "full-flow"].forEach((fragment) => {
    assert.match(f2, new RegExp(`href="f-3-transformer-block\\.html#${fragment}"`));
  });
});

test("F-2.25 bridges one-head Attention to F-2.5, and F-3 links back to both prerequisites", () => {
  const f225 = readFileSync(resolve(learnRoot, "chapters/foundations/f-2-25-multi-head-attention.html"), "utf8");
  assert.match(f225, /href="f-2-5-linear-gelu-mlp\.html#start"/);

  const f3 = readFileSync(resolve(learnRoot, "chapters/foundations/f-3-transformer-block.html"), "utf8");
  assert.match(f3, /href="f-2-5-linear-gelu-mlp\.html#mlp-trace"/);
  assert.match(f3, /href="f-2-25-multi-head-attention\.html#output-projection"/);
});
