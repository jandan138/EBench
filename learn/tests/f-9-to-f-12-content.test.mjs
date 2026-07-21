import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");
const contentSource = read("content.js");
const sandbox = { window: {} };
vm.runInNewContext(contentSource, sandbox);
const flat = sandbox.window.EBOOK.flat;

const section = (chapter, id) => chapter.match(
  new RegExp("<h2[^>]*id=\"" + id + "\"[^>]*>[\\s\\S]*?(?=<h2|</article>)"),
)?.[0].replace(/\s+/g, " ") || "";

const chapters = {
  "f-9": "chapters/foundations/f-9-hidden-state-product.html",
  "f-10": "chapters/foundations/f-10-training-loop.html",
  "f-11": "chapters/foundations/f-11-vla-reads-hidden.html",
  "f-12": "chapters/foundations/f-12-adapter-lora.html",
};

test("content.js registers f-9..f-12 in order right after f-8", () => {
  const ids = ["f-8", "f-9", "f-10", "f-11", "f-12"];
  const idx = ids.map((id) => flat.findIndex((s) => s.id === id));
  idx.forEach((i) => assert.notEqual(i, -1, "missing nav entry " + ids[idx.indexOf(i)]));
  assert.deepEqual(idx, [idx[0], idx[0] + 1, idx[0] + 2, idx[0] + 3, idx[0] + 4]);
  ids.slice(1).forEach((id) => {
    const entry = flat.find((s) => s.id === id);
    assert.equal(entry.partLabel, "Part F");
    assert.ok(existsSync(new URL("../" + entry.file, import.meta.url)), "missing file for " + id);
    assert.ok(entry.keywords.length > 20, "keywords too thin for " + id);
  });
});

test("each new chapter has the full skeleton and required h2 sections in order", () => {
  const required = {
    "f-9": ["factory", "each-token-own", "why-context-inside", "four-heads", "mainline", "checkpoint", "recap"],
    "f-10": ["param-inventory", "what-is-gradient", "one-step", "highway", "why-ln", "why-two-ln", "pre-vs-post-norm", "checkpoint", "recap"],
    "f-11": ["h-context-matrix", "what-fusion-means", "read-strategies", "why-not-last-token", "checkpoint", "recap"],
    "f-12": ["why-freeze", "adapter", "lora", "gradient-path", "landscape", "checkpoint", "recap"],
  };
  for (const [id, file] of Object.entries(chapters)) {
    const ch = read(file);
    assert.match(ch, new RegExp("data-section=\"" + id + "\""), id + " data-section");
    assert.match(ch, /<p class="lede">/, id + " lede");
    assert.match(ch, /class="bridge (rl|g103)"/, id + " needs at least one bridge box");
    const positions = required[id].map((h) => {
      const p = ch.indexOf("id=\"" + h + "\"");
      assert.notEqual(p, -1, id + " missing h2#" + h);
      return p;
    });
    assert.deepEqual(positions, [...positions].sort((a, b) => a - b), id + " h2 order");
  }
});

test("f-9 states the product mainline and explains WHY each head reads its position", () => {
  const ch = read(chapters["f-9"]);
  assert.match(section(ch, "factory"), /hidden state/i);
  assert.match(section(ch, "each-token-own"), /\[B,n,d\]|B×n×d/);
  assert.match(section(ch, "four-heads"), /GPT/);
  assert.match(section(ch, "four-heads"), /BERT/);
  assert.match(section(ch, "four-heads"), /VLA/);
  assert.match(section(ch, "four-heads"), /causal|因果/);
  assert.match(ch, /data-widget="task-head-switcher"/);
  assert.ok(
    ch.indexOf("registry.js") < ch.indexOf("task-head-switcher.js") &&
    ch.indexOf("task-head-switcher.js") < ch.indexOf("book.js"),
    "f-9 widget script order",
  );
});

test("f-10 defines gradient before using it and links the loss chapters", () => {
  const ch = read(chapters["f-10"]);
  assert.ok(ch.indexOf("id=\"what-is-gradient\"") < ch.indexOf("id=\"one-step\""), "gradient defined before training loop");
  assert.ok(ch.indexOf("id=\"one-step\"") < ch.indexOf("id=\"highway\""), "loop before highway");
  assert.match(ch, /0\.1\^?\{?100|0\.1.*100.*(消失|趋近于|接近)/);
  assert.match(ch, /I\+J|\+\s*J_F|恒等/);
  assert.match(ch, /f-5-regression-mse\.html/);
  assert.match(ch, /f-6-cross-entropy\.html/);
  assert.match(ch, /f-3-transformer-block\.html#/);
  const inventory = section(ch, "param-inventory");
  ["W_Q|W<sub>Q|WQ", "Embedding", "γ|gamma", "head|Head"].forEach((m) =>
    assert.match(inventory, new RegExp(m), "param-inventory missing " + m));
  assert.match(section(ch, "why-two-ln"), /独立|两套/);
  assert.match(section(ch, "pre-vs-post-norm"), /post-norm/i);
});

test("f-11 gives the Q22 minimal answer with the corrected token routing", () => {
  const ch = read(chapters["f-11"]);
  assert.match(section(ch, "h-context-matrix"), /矩阵|\[B,n,d\]|B×n×d/);
  const strategies = section(ch, "read-strategies");
  ["pooling", "cross-attention|Cross-Attention|cross attention", "query"].forEach((m) =>
    assert.match(strategies, new RegExp(m, "i"), "read-strategies missing " + m));
  const why = section(ch, "why-not-last-token");
  assert.match(why, /GPT/);
  assert.match(why, /空间|视觉|patch/i);
  assert.match(ch, /state.{0,40}(expert|专家)/i, "state token must route to the action expert side");
  assert.match(ch, /5-7-action-expert\.html#(?:action-expert|shared-attention)/);
});

test("f-12 separates freezing from stop-gradient and links KI and X-VLA", () => {
  const ch = read(chapters["f-12"]);
  assert.match(section(ch, "adapter"), /降维|bottleneck|瓶颈/i);
  assert.match(section(ch, "lora"), /BA|低秩/);
  const gp = section(ch, "gradient-path");
  assert.match(gp, /不更新|冻结/);
  assert.match(gp, /stop-gradient|截断/);
  assert.match(ch, /5b-5-ki-gradient\.html#not-freezing/);
  assert.match(ch, /6-2-xvla\.html#two-stage/);
  assert.match(ch, /data-widget="peft-gradient"/);
  assert.ok(
    ch.indexOf("registry.js") < ch.indexOf("peft-gradient.js") &&
    ch.indexOf("peft-gradient.js") < ch.indexOf("book.js"),
    "f-12 widget script order",
  );
});

test("old chapters hand off to the new sections without breaking existing anchors", () => {
  const f8 = read("chapters/foundations/f-8-probability-multimodal.html");
  assert.match(f8, /f-9-hidden-state-product\.html/);
  assert.doesNotMatch(section(f8, "recap"), /地基铺完了/);

  const f3 = read("chapters/foundations/f-3-transformer-block.html");
  assert.match(section(f3, "training-heads"), /f-9-hidden-state-product\.html/);
  assert.match(section(f3, "residual-gradient"), /f-10-training-loop\.html/);
  assert.match(f3, /f-10-training-loop\.html#why-two-ln|f-10-training-loop\.html#why-ln/);

  const f225 = read("chapters/foundations/f-2-25-multi-head-attention.html");
  const gpuView = f225.match(/<h3[^>]*id="gpu-view"[^>]*>[\s\S]*?(?=<h3|<h2|<\/article>)/)?.[0] || "";
  assert.match(gpuView, /等价|逐位相同|完全相等/);

  const f25 = read("chapters/foundations/f-2-5-linear-gelu-mlp.html");
  assert.match(section(f25, "shared-mlp"), /为什么.{0,20}共享/);

  const f26 = read("chapters/foundations/f-2-6-activation-gates.html");
  const silu = f26.indexOf("id=\"silu-swiglu\"");
  assert.notEqual(silu, -1, "f-2-6 missing silu-swiglu addendum");
  assert.ok(silu > f26.indexOf("id=\"training-gates\""), "silu-swiglu after training-gates");
  assert.ok(silu < f26.indexOf("id=\"checkpoint\""), "silu-swiglu before checkpoint");
  assert.match(section(f26, "silu-swiglu"), /SwiGLU/);

  assert.match(read("chapters/05-theory/5-7-action-expert.html"), /f-11-vla-reads-hidden\.html/);
  assert.match(read("chapters/05b-vla-systems/5b-5-ki-gradient.html"), /f-12-adapter-lora\.html/);
  assert.match(read("chapters/06-baselines/6-2-xvla.html"), /f-12-adapter-lora\.html/);
});
