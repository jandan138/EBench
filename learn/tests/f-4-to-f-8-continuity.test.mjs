import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = (relative) => readFileSync(new URL(relative, root), "utf8");
const f3 = read("chapters/foundations/f-3-transformer-block.html");
const f4 = read("chapters/foundations/f-4-everything-is-token.html");
const f5 = read("chapters/foundations/f-5-regression-mse.html");
const f6 = read("chapters/foundations/f-6-cross-entropy.html");
const f7 = read("chapters/foundations/f-7-gym-action.html");
const f8 = read("chapters/foundations/f-8-probability-multimodal.html");
const widget = read("assets/js/widgets/multimodal-distribution.js");
const css = read("assets/css/book.css");
const contentSource = read("content.js");

const section = (source, id) => source.match(
  new RegExp(`<h[23][^>]*id="${id}"[^>]*>[\\s\\S]*?(?=<h[23]|</article>)`),
)?.[0].replace(/\s+/g, " ") || "";

const assertInOrder = (source, ids, label) => {
  const positions = ids.map((id) => source.indexOf(`id="${id}"`));
  positions.forEach((position, index) => {
    assert.ok(position >= 0, `${label} missing #${ids[index]}`);
  });
  assert.deepEqual([...positions].sort((left, right) => left - right), positions, `${label} teaching order regressed`);
};

const assertAnchor = (source, id, label) => {
  const matches = source.match(new RegExp(`id="${id}"`, "g")) || [];
  assert.equal(matches.length, 1, `${label} must preserve one #${id} anchor`);
};

test("F-3 hands its abstract rows to F-4's VLA input bridge without changing the chapter order", () => {
  const sandbox = { window: {} };
  vm.runInNewContext(contentSource, sandbox);
  const flat = sandbox.window.EBOOK.flat;
  const ids = ["f-3", "f-4", "f-5", "f-6", "f-7", "f-8"];
  const indexes = ids.map((id) => flat.findIndex((entry) => entry.id === id));
  assert.deepEqual(indexes, [indexes[0], indexes[0] + 1, indexes[0] + 2, indexes[0] + 3, indexes[0] + 4, indexes[0] + 5]);
  assert.match(section(f3, "recap"), /f-4-everything-is-token\.html#vla-input-bridge/);
  assert.match(section(f4, "vla-input-bridge"), /\[B,n,d\]/);
});

test("F-4 distinguishes text tokens, sequence slots, and the three action roles before packing observations", () => {
  ["string-id-vector", "two-routes", "state-action", "packed"].forEach((id) => assertAnchor(f4, id, "F-4"));
  assertInOrder(f4, [
    "vla-input-bridge", "string-id-vector", "token-two-meanings", "hidden-lifecycle",
    "two-routes", "state-action", "action-roles", "packed", "recap",
  ], "F-4");
  const meanings = section(f4, "token-two-meanings");
  ["文本 token", "sequence slot", "向量位置"].forEach((marker) => {
    assert.ok(meanings.includes(marker), `F-4 #token-two-meanings missing ${marker}`);
  });
  const state = section(f4, "state-action");
  ["k=1", "k 个", "u", "W", "b"].forEach((marker) => {
    assert.ok(state.includes(marker), `F-4 #state-action missing ${marker}`);
  });
  const roles = section(f4, "action-roles");
  ["训练时专家 target", "推理时 policy output", "可选上下文输入", "teacher-forcing"].forEach((marker) => {
    assert.ok(roles.includes(marker), `F-4 #action-roles missing ${marker}`);
  });
  assert.match(section(f4, "packed"), /不是 observation 输入/);
});

test("F-5 grows loss from one scalar to action chunks and then batches", () => {
  ["bc", "mse", "mean", "conditional-mean"].forEach((id) => assertAnchor(f5, id, "F-5"));
  const mse = f5.slice(f5.indexOf('id="mse"'), f5.indexOf('id="mean"'));
  const scalar = mse.indexOf("平方误差是");
  const chunk = mse.indexOf("一个 action chunk");
  const batch = mse.indexOf("完整 batch 公式");
  assert.ok(scalar >= 0, "F-5 must start MSE with one scalar squared error");
  assert.ok(chunk > scalar, "F-5 must explain a chunk after the scalar example");
  assert.ok(batch > chunk, "F-5 must put the full batch formula last");
  ["\\hat A,A\\in\\mathbb{R}^{B\\times H\\times d_a}", "batch size", "b,h,j"].forEach((marker) => {
    assert.ok(mse.includes(marker), `F-5 #mse missing ${marker}`);
  });
  assert.match(section(f5, "mean"), /模型可见信息相同或不可区分/);
  assert.match(section(f5, "conditional-mean"), /总体数据分布/);
});

test("F-6 keeps one wrong prediction visible through logits, softmax, CE, and sequence targets", () => {
  ["logits", "softmax", "ce", "sequence", "action-token"].forEach((id) => assertAnchor(f6, id, "F-6"));
  assertInOrder(f6, ["logits", "softmax", "worked-example", "ce", "temperature", "sequence", "action-token", "recap"], "F-6");
  const opening = `${section(f6, "logits")} ${section(f6, "softmax")} ${section(f6, "worked-example")} ${section(f6, "ce")}`;
  ["target=place", "pick", "0.247", "1.398", "提高 place 的 logit"].forEach((marker) => {
    assert.ok(opening.includes(marker), `F-6 CE chain missing ${marker}`);
  });
  const sequence = section(f6, "sequence");
  ["我", "喜欢", "苹果", "&lt;eos&gt;", "\\{0,\\ldots,V-1\\}^{B\\times T}", "原始 logits"].forEach((marker) => {
    assert.ok(sequence.includes(marker), `F-6 #sequence missing ${marker}`);
  });
});

test("F-7 separates Gymnasium episode boundaries from EvalClient completion and explains replanning", () => {
  ["loop", "evalclient", "spaces", "chunk"].forEach((id) => assertAnchor(f7, id, "F-7"));
  const loop = section(f7, "loop");
  ["obs, info = env.reset()", "terminated", "truncated", "episode_done"].forEach((marker) => {
    assert.ok(loop.includes(marker), `F-7 #loop missing ${marker}`);
  });
  const evalClient = section(f7, "evalclient");
  ["eval_finished", "不是", "worker_id", "reset"].forEach((marker) => {
    assert.ok(evalClient.includes(marker), `F-7 #evalclient missing ${marker}`);
  });
  assert.match(section(f7, "spaces"), /\\{0,\\ldots,K-1\\}/);
  const chunk = section(f7, "chunk");
  ["H_{\\text{pred}}", "K_{\\text{exec}}", "K_{\\text{exec}}\\le H_{\\text{pred}}"].forEach((marker) => {
    assert.ok(chunk.includes(marker), `F-7 #chunk missing ${marker}`);
  });
});

test("F-8 builds density, modes, and sampling in a bounded beginner order", () => {
  ["distribution", "density", "single-vs-multi", "generative", "flow-boundary"].forEach((id) => assertAnchor(f8, id, "F-8"));
  assertInOrder(f8, [
    "distribution", "point-prediction", "density", "single-vs-multi", "multimodal",
    "flow-boundary", "generative", "checkpoint", "recap",
  ], "F-8");
  const density = section(f8, "density");
  ["随机变量", "具体取值", "区域", "积分", "二维示意"].forEach((marker) => {
    assert.ok(density.includes(marker), `F-8 #density missing ${marker}`);
  });
  const modes = section(f8, "single-vs-multi");
  ["MSE", "一个点", "单高斯", "一个峰", "多峰", "\\mu", "\\Sigma"].forEach((marker) => {
    assert.ok(modes.includes(marker), `F-8 #single-vs-multi missing ${marker}`);
  });
  const generative = section(f8, "generative");
  ["训练", "推理", "g_\\theta", "\\epsilon", "I", "多步采样器"].forEach((marker) => {
    assert.ok(generative.includes(marker), `F-8 #generative missing ${marker}`);
  });
  ["MSE 点预测", "单高斯（一个峰）", "多峰（两座山）", "噪声起点", "最终样本"].forEach((marker) => {
    assert.ok(widget.includes(marker), `F-8 widget missing ${marker}`);
  });
  assert.doesNotMatch(widget, /单高斯只能有一个峰 → 平均到障碍物中心/);
});

test("F-8 keeps the point prediction visible on top of the obstacle", () => {
  const draw = widget.slice(widget.indexOf("function draw()"), widget.indexOf("function render()"));
  assert.ok(draw.indexOf("obstacle();") < draw.indexOf('if (mode === "point")'), "the obstacle must be drawn before the point prediction");
  assert.match(draw, /一个点预测（撞上障碍）/);
});

test("new Foundations comparison tables stack on mobile instead of relying on horizontal scroll", () => {
  assert.match(css, /foundation-mobile-stack/);
  [f4, f6, f7, f8].forEach((source, index) => {
    assert.match(source, /foundation-mobile-stack/, `F-${index + 4} needs a scoped mobile-stack table`);
    assert.match(source, /data-label=/, `F-${index + 4} mobile-stack table needs labels`);
  });
});
