import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
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
  const url = new URL(reference, "https://ebook.local/" + sourceFile);
  return {
    file: resolve(learnRoot, "." + decodeURIComponent(url.pathname)),
    fragment: decodeURIComponent(url.hash.slice(1)),
  };
};
const isLocal = (reference) => !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(reference);
const chapter = (file) => readFileSync(resolve(learnRoot, file), "utf8");

test("formal navigation registers the continuous F-2 -> F-2.25 -> F-2.5 -> F-2.6 -> F-3 path", () => {
  assert.equal(flat.length, 64);
  assert.equal(new Set(flat.map((section) => section.id)).size, flat.length);
  assert.equal(new Set(flat.map((section) => section.file)).size, flat.length);
  flat.forEach((section) => assert.ok(existsSync(resolve(learnRoot, section.file)), "missing registered file " + section.file));

  const ids = ["f-2", "f-2-25", "f-2-5", "f-2-6", "f-3"];
  const indexes = ids.map((id) => flat.findIndex((section) => section.id === id));
  assert.deepEqual(indexes, [indexes[0], indexes[0] + 1, indexes[0] + 2, indexes[0] + 3, indexes[0] + 4]);

  const f25 = flat.find((section) => section.id === "f-2-5");
  const f26 = flat.find((section) => section.id === "f-2-6");
  assert.match(f25.title, /Linear.*MLP/);
  assert.doesNotMatch(f25.title, /ReLU/);
  ["relu", "gelu", "bias", "gate"].forEach((keyword) => {
    assert.ok(f26.keywords.toLowerCase().includes(keyword), "F-2.6 keyword missing: " + keyword);
  });
});

test("registered chapters have resolvable local assets, links, and fragments", () => {
  flat.forEach(({ file }) => {
    const source = chapter(file);
    for (const reference of references(source)) {
      if (!isLocal(reference)) continue;
      const target = resolveReference(file, reference);
      assert.ok(target.file.startsWith(learnRoot + "/"), file + " escapes learn/: " + reference);
      assert.ok(existsSync(target.file), file + " has missing local reference " + reference);
      if (target.fragment) {
        const targetSource = readFileSync(target.file, "utf8");
        const fragment = target.fragment.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
        assert.match(targetSource, new RegExp("(?:id|name)=\"" + fragment + "\""), file + " has missing fragment " + reference);
      }
    }
  });
});

test("navigation parsing accepts single-quoted and double-quoted local attributes", () => {
  const fixture = "<a href='fixtures/single.html#single'></a><img src=\"fixtures/double.svg\" />";
  assert.deepEqual(references(fixture), ["fixtures/single.html#single", "fixtures/double.svg"]);
});

test("F-2 exposes the prerequisites in teaching order", () => {
  const f2 = chapter("chapters/foundations/f-2-attention.html");
  ["start", "output-projection"].forEach((fragment) => {
    assert.match(f2, new RegExp("href=\"f-2-25-multi-head-attention\\.html#" + fragment + "\""));
  });
  assert.match(f2, /href="f-2-5-linear-gelu-mlp\.html#start"/);
  assert.match(f2, /href="f-2-6-activation-gates\.html#start"/);
  assert.match(f2, /href="f-3-transformer-block\.html#full-flow"/);
});

test("adjacent foundations chapters hand readers forward and retain prerequisite links", () => {
  const f225 = chapter("chapters/foundations/f-2-25-multi-head-attention.html");
  const f25 = chapter("chapters/foundations/f-2-5-linear-gelu-mlp.html");
  const f26 = chapter("chapters/foundations/f-2-6-activation-gates.html");
  const f3 = chapter("chapters/foundations/f-3-transformer-block.html");

  assert.match(f225, /href="f-2-5-linear-gelu-mlp\.html#start"/);
  assert.match(f25, /href="f-2-6-activation-gates\.html#start"/);
  assert.match(f26, /href="f-3-transformer-block\.html#full-flow"/);
  assert.match(f3, /href="f-2-25-multi-head-attention\.html#output-projection"/);
  assert.match(f3, /href="f-2-5-linear-gelu-mlp\.html#mlp-trace"/);
  assert.match(f3, /href="f-2-6-activation-gates\.html#preactivation"/);
});
