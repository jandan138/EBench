import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = (relative) => readFileSync(new URL(relative, root), "utf8");
const f225 = read("chapters/foundations/f-2-25-multi-head-attention.html");
const f25 = read("chapters/foundations/f-2-5-linear-gelu-mlp.html");
const f26Path = new URL("../chapters/foundations/f-2-6-activation-gates.html", import.meta.url);
const f26 = existsSync(f26Path) ? readFileSync(f26Path, "utf8") : "";
const f3 = read("chapters/foundations/f-3-transformer-block.html");
const contentSource = read("content.js");

const positions = (source, ids) => ids.map((id) => source.indexOf(`id="${id}"`));
const assertInOrder = (source, ids, label) => {
  const values = positions(source, ids);
  values.forEach((position, index) => assert.ok(position >= 0, `${label} missing #${ids[index]}`));
  assert.deepEqual([...values].sort((left, right) => left - right), values, `${label} teaching order regressed`);
};
const section = (source, id) => source.match(
  new RegExp(`<h[23][^>]*id="${id}"[^>]*>[\\s\\S]*?(?=<h[23]|</article>)`),
)?.[0].replace(/\s+/g, " ") || "";

test("F-2.25 closes the beginner story before visible implementation depth", () => {
  assertInOrder(f225, [
    "start", "coordinate-system", "single-head", "parallel-heads", "concat",
    "output-projection", "core-summary", "implementation-deep-dive", "shape-ledger",
    "gpu-view", "mask-boundary", "training", "mqa-gqa", "checkpoint", "recap",
  ], "F-2.25");
  const start = section(f225, "start");
  ["B", "n", "d_model", "d_head"].forEach((marker) => assert.ok(start.includes(marker), `F-2.25 #start must define ${marker}`));
  const output = section(f225, "output-projection");
  ["普通 Linear", "Y=CW_O+b_O", "加权组合", "bias"].forEach((marker) => {
    assert.ok(output.includes(marker), `F-2.25 #output-projection missing ${marker}`);
  });
  assert.match(section(f225, "core-summary"), /softmax 前/);
  assert.match(section(f225, "mqa-gqa"), /MQA/);
  assert.match(section(f225, "mqa-gqa"), /GQA/);
});

test("F-2.5 gives one hidden state a complete MLP journey before activation theory", () => {
  assertInOrder(f25, [
    "start", "function", "scalar-linear", "vector-linear", "linear-boundaries",
    "gelu-bridge", "why-nonlinearity", "mlp-trace", "shared-mlp",
    "attention-bridge", "training", "checkpoint", "recap", "activation-moved",
  ], "F-2.5");
  const bridge = section(f25, "gelu-bridge");
  ["固定", "逐元素", "不在 token 位置之间通信"].forEach((marker) => {
    assert.ok(bridge.includes(marker), `F-2.5 #gelu-bridge missing ${marker}`);
  });
  assert.ok(!/<h2[^>]*id="preactivation"/.test(f25), "F-2.5 must not keep the activation deep dive as a visible core section");
  ["preactivation", "sign-is-not-meaning", "bias-threshold", "relu", "gelu", "training-gates", "negative-information"].forEach((id) => {
    assert.match(f25, new RegExp(`<a id="${id}"[^>]*aria-hidden="true"`), `F-2.5 compatibility anchor #${id} missing`);
  });
  assert.match(section(f25, "activation-moved"), /f-2-6-activation-gates\.html#start/);
});

test("F-2.6 owns the sign, gate, and training deep dive with the missing notation bridge", () => {
  assert.ok(existsSync(f26Path), "F-2.6 activation chapter missing");
  assertInOrder(f26, [
    "start", "preactivation", "sign-is-not-meaning", "relu", "bias-threshold",
    "gelu", "negative-information", "training-gates", "checkpoint", "recap",
  ], "F-2.6");
  const preactivation = section(f26, "preactivation");
  ["xW+b", "w^T x+b", "同一件事", "z_1=1(1)+1(1.1)+0=2.1"].forEach((marker) => {
    assert.ok(preactivation.includes(marker), `F-2.6 #preactivation missing ${marker}`);
  });
  const training = section(f26, "training-gates");
  ["target", "Loss", "w_new=w-η", "optional"].forEach((marker) => {
    assert.ok(training.includes(marker), `F-2.6 #training-gates missing ${marker}`);
  });
  assert.match(section(f26, "recap"), /f-3-transformer-block\.html#full-flow/);
});

test("F-3 starts with the whole Block journey, then explains its parts", () => {
  assertInOrder(f3, [
    "block-scene", "mainline", "full-flow", "block-trace", "attention-params",
    "mlp", "residual-ln", "residual-gradient", "layernorm", "layernorm-axis",
    "layernorm-semantics", "variants", "deep-stack", "training-heads", "checkpoint", "recap",
  ], "F-3");
  const opening = `${section(f3, "block-scene")} ${section(f3, "mainline")} ${section(f3, "full-flow")}`;
  ["[B,n,d]", "逐元素相加", "整个序列", "逐位置", "LN_1", "LN_2"].forEach((marker) => {
    assert.ok(opening.includes(marker), `F-3 opening journey missing ${marker}`);
  });
  assert.match(section(f3, "residual-gradient"), /optional/);
  assert.match(section(f3, "recap"), /f-2-6-activation-gates\.html#preactivation/);
});

test("navigation makes activation a first-class bridge without breaking old F-2.5 links", () => {
  const sandbox = { window: {} };
  vm.runInNewContext(contentSource, sandbox);
  const flat = sandbox.window.EBOOK.flat;
  assert.equal(flat.length, 64);
  const ids = ["f-2", "f-2-25", "f-2-5", "f-2-6", "f-3"];
  const indexes = ids.map((id) => flat.findIndex((entry) => entry.id === id));
  assert.deepEqual(indexes, [indexes[0], indexes[0] + 1, indexes[0] + 2, indexes[0] + 3, indexes[0] + 4]);
  const f25Entry = flat.find((entry) => entry.id === "f-2-5");
  const f26Entry = flat.find((entry) => entry.id === "f-2-6");
  assert.match(f25Entry.title, /Linear.*MLP/);
  assert.doesNotMatch(f25Entry.title, /ReLU/);
  ["relu", "gelu", "bias", "gate"].forEach((keyword) => assert.ok(f26Entry.keywords.toLowerCase().includes(keyword)));
  assert.match(f25, /href="f-2-6-activation-gates\.html#start"/);
  assert.match(f26, /href="f-3-transformer-block\.html#full-flow"/);
  assert.match(f3, /href="f-2-6-activation-gates\.html#preactivation"/);
});
