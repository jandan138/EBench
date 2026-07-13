import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const chapterPath = new URL("../chapters/foundations/f-2-5-linear-gelu-mlp.html", import.meta.url);
const chapter = existsSync(chapterPath) ? readFileSync(chapterPath, "utf8") : "";
const corePath = new URL("../assets/js/widgets/mlp-basics-core.js", import.meta.url);
const widgetPath = new URL("../assets/js/widgets/mlp-basics-viz.js", import.meta.url);
const activationWidgetPath = new URL("../assets/js/widgets/activation-gates-viz.js", import.meta.url);
const cssPath = new URL("../assets/css/book.css", import.meta.url);
const widgetSource = existsSync(widgetPath) ? readFileSync(widgetPath, "utf8") : "";
const activationWidgetSource = existsSync(activationWidgetPath) ? readFileSync(activationWidgetPath, "utf8") : "";
const cssSource = readFileSync(cssPath, "utf8");
const contentSource = readFileSync(new URL("../content.js", import.meta.url), "utf8");
const f3Chapter = readFileSync(new URL("../chapters/foundations/f-3-transformer-block.html", import.meta.url), "utf8");
const section = (id) => chapter.match(
  new RegExp(`<h2[^>]*id="${id}"[^>]*>[\\s\\S]*?(?=<h2|</article>)`),
)?.[0].replace(/\s+/g, " ") || "";

const requireMarkers = (id, markers) => {
  const body = section(id);
  assert.ok(body, `missing #${id}`);
  markers.forEach((marker) => assert.ok(body.includes(marker), `#${id} missing ${marker}`));
  return body;
};

test("F-2.5 function section teaches one rule through multiple substitutions", () => {
  const body = requireMarkers("function", ["f(x)=2x+1", "同一条规则"]);
  assert.match(body, /f\(0\)=1/);
  assert.match(body, /f\(2\)=5/);
});

test("F-2.5 scalar Linear substitutes numbers before relying on symbolic notation", () => {
  const body = requireMarkers("scalar-linear", ["x=3", "w=2", "b=1", "2(3)+1=7", "y=wx+b"]);
  assert.ok(body.indexOf("2(3)+1=7") < body.indexOf("y=wx+b"));
});

test("F-2.5 vector Linear derives four biased outputs before matrix notation", () => {
  const body = requireMarkers("vector-linear", ["矩阵写法", "y = xW + b"]);
  ["y_1=x_1w_{11}+x_2w_{21}+b_1", "y_2=x_1w_{12}+x_2w_{22}+b_2", "y_3=x_1w_{13}+x_2w_{23}+b_3", "y_4=x_1w_{14}+x_2w_{24}+b_4"]
    .forEach((equation) => assert.ok(body.includes(equation), `missing ${equation}`));
  assert.ok(body.indexOf("矩阵写法") < body.indexOf("y = xW + b"));
});

test("F-2.5 vector Linear maps matrix axes to input and output features", () => {
  const body = requireMarkers("vector-linear", ["W:[d_in,d_out]", "b:[d_out]", "输入 feature", "输出 feature"]);
  assert.match(body, /<table[^>]*class="f25-mobile-stack"/);
  assert.match(body, /行.*输入 feature/);
  assert.match(body, /列.*输出 feature/);
});

test("F-2.5 GELU section states its elementwise limits and boundary", () => {
  const body = requireMarkers("gelu", ["GELU(x)=x\\Phi(x)", "逐元素", "没有可学习矩阵", "不在 token 位置之间通信", "可以得到负输出", "不被限制在 [0,1]", "并非单调"]);
  assert.ok(!body.includes("另一套矩阵"));
});

test("F-2.5 GELU separates its exact definition, displayed-decimal evaluation, and tanh approximation", () => {
  const body = requireMarkers("gelu", ["精确定义", "GELU(x)=x\\Phi(x)", "数值求值", "显示到三位小数", "常见的 tanh 近似", "\\operatorname{GELU}_{\\tanh}"]);
  assert.ok(body.indexOf("精确定义") < body.indexOf("数值求值"));
  assert.ok(body.indexOf("数值求值") < body.indexOf("常见的 tanh 近似"));
});

test("F-2.5 GELU teaches static values and an accessible curve before Phi", () => {
  const body = requireMarkers("gelu", ["先看具体数值", "f25-gelu-values", "f25-gelu-figure", "GELU(x)=x\\Phi(x)"]);
  const formula = body.indexOf("GELU(x)=x\\Phi(x)");
  assert.ok(body.indexOf("先看具体数值") < body.indexOf("f25-gelu-values"));
  assert.ok(body.indexOf("f25-gelu-values") < formula);
  assert.ok(body.indexOf("f25-gelu-figure") < formula);
  for (const [input, relu, gelu] of [["-2", "0.000", "-0.046"], ["-1", "0.000", "-0.159"], ["0", "0.000", "0.000"], ["1", "1.000", "0.841"], ["2", "2.000", "1.954"]]) {
    assert.match(body, new RegExp(`data-gelu-input="${input}" data-relu-value="${relu}" data-gelu-value="${gelu}"`));
  }
  assert.match(body, /<svg[^>]*role="img"[^>]*aria-labelledby="f25-gelu-curve-title f25-gelu-curve-desc"/);
  assert.match(body, /<title id="f25-gelu-curve-title">/);
  assert.match(body, /<desc id="f25-gelu-curve-desc">/);
});

test("F-2.5 defines MLP, W, d, and d_ff before relying on each term", () => {
  const articleBody = chapter.slice(chapter.indexOf("</h1>") + "</h1>".length, chapter.indexOf("</article>"))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

  assert.equal(articleBody.indexOf("MLP"), articleBody.indexOf("MLP 是"), "first MLP use must define the three-stage module");
  assert.match(section("start"), /MLP 是.*Linear 1 → GELU → Linear 2/);
  assert.equal(articleBody.indexOf("W"), articleBody.indexOf("W 是把"), "first W use must explain the weight matrix");
  assert.equal(articleBody.search(/\bd\b/), articleBody.indexOf("d 是"), "first d use must define model width");
  assert.equal(articleBody.indexOf("d_ff"), articleBody.indexOf("d_ff 是"), "first d_ff use must define intermediate width");
});

test("F-2.5 nonlinearity section distinguishes usual and special affine cases", () => {
  requireMarkers("why-nonlinearity", ["W_*=W_1W_2", "b_*=b_1W_2+b_2", "通常不再是 affine", "特殊参数"]);
});

test("F-2.5 MLP trace contains the deterministic four-stage values", () => {
  const body = requireMarkers("mlp-trace", ["[2, -1]", "[3, -2, 0.5, 1]", "[2.996, -0.046, 0.346, 0.841]", "[0.614, 1.529]", "2 → 4 → 2"]);
  assert.match(body, /<div class="f25-flow" aria-label="MLP 数据流">/);
  assert.equal((body.match(/class="f25-stage"/g) || []).length, 4);
});

test("F-2.5 static trace exposes parameters and all four Linear 1 weighted sums", () => {
  const body = requireMarkers("mlp-trace", ["W1", "B1", "W2", "B2"]);
  [
    "2(1)+(-1)(-1)+0=3",
    "2(0)+(-1)(2)+0=-2",
    "2(0.5)+(-1)(0.5)+0=0.5",
    "2(0.25)+(-1)(-0.50)+0=1",
  ].forEach((equation) => assert.ok(body.includes(equation), `missing static weighted sum ${equation}`));
});

test("F-2.5 shared MLP section separates parameter sharing from output equality", () => {
  requireMarkers("shared-mlp", ["同一组 W_1,b_1,W_2,b_2", "不同输入可以", "相同输入", "确定性", "standard dense", "MoE"]);
});

test("F-2.5 attention bridge states a useful but non-exclusive division", () => {
  requireMarkers("attention-bridge", ["跨位置通信", "位置内部计算", "不是绝对能力边界", "直接接输出头"]);
});

test("F-2.5 training section distinguishes gradients, updates, and parameter roles", () => {
  requireMarkers("training", ["反向传播", "梯度", "优化器", "W_1,b_1,W_2,b_2", "初始化", "checkpoint", "可训练", "冻结", "省略 bias", "人工分配"]);
});

test("F-2.5 preserves the ordered static teaching path and checkpoints", () => {
  const ids = [...chapter.matchAll(/<h2[^>]*id="([^"]+)"/g)].map((match) => match[1]);
  const requiredIds = ["start", "function", "scalar-linear", "vector-linear", "linear-boundaries", "gelu", "why-nonlinearity", "mlp-trace", "shared-mlp", "attention-bridge", "training", "checkpoint", "recap"];
  assert.deepEqual(ids.filter((id) => requiredIds.includes(id)), requiredIds);
  for (let outcome = 1; outcome <= 9; outcome += 1) {
    assert.equal((chapter.match(new RegExp(`data-check="outcome-${outcome}"`, "g")) || []).length, 1, `outcome-${outcome} must appear once`);
  }
});

test("F-2.5 wires the core and widget before book runtime", () => {
  assert.ok(existsSync(corePath), "core file missing");
  assert.ok(existsSync(widgetPath), "widget file missing");
  const order = ["widgets/registry.js", "widgets/mlp-basics-core.js", "widgets/mlp-basics-viz.js", "assets/js/book.js"].map((source) => chapter.indexOf(source));
  assert.ok(order.every((index) => index >= 0));
  assert.deepEqual(order, order.slice().sort((a, b) => a - b));
  assert.match(chapter, /data-widget="mlp-basics-viz"/);
  assert.match(chapter.match(/<noscript>[\s\S]*?<\/noscript>/)?.[0] || "", /输入 \[2, -1\][\s\S]*Linear 1 \[3, -2, 0.5, 1\][\s\S]*GELU \[2.996, -0.046, 0.346, 0.841\][\s\S]*Linear 2 \[0.614, 1.529\]/);
});

test("F-2.5 math core stays independent of browser mounting APIs", () => {
  const core = readFileSync(corePath, "utf8");
  assert.doesNotMatch(core, /IntersectionObserver/);
});

test("F-2.5 widget uses a dedicated concise live status instead of the stage", () => {
  assert.match(widgetSource, /class="mbv-status" role="status" aria-live="polite" aria-atomic="true"/);
  assert.doesNotMatch(widgetSource, /class="mbv-stage"[^>]*aria-live/);
  assert.match(cssSource, /\.mlp-basics-viz \.mbv-status\s*\{[^}]*position:\s*absolute[^}]*width:\s*1px[^}]*height:\s*1px[^}]*clip-path:\s*inset\(50%\)/s);
});

test("F-2.5 static selectors remain section scoped", () => {
  for (const rule of cssSource.matchAll(/([^{}]+)\{/g)) {
    if (rule[1].includes(".f25-")) assert.match(rule[1], /body\[data-section="f-2-5"\] \.article/);
  }
});

test("F-2.5 activation gates have stable section-local contracts and answer coverage", () => {
  const required = [
    ["preactivation", ["pre-activation", "z=w^T x+b", "hidden state", "激活后的数值", "affine", "投影"]],
    ["sign-is-not-meaning", ["不是", "有用", "无用", "符号", "学习到的方向", "sign flip"]],
    ["bias-threshold", ["ReLU(x-3)", "x>3", "w^T x+b=0", "方向", "位置", "w=0", "负"]],
    ["relu", ["ReLU(z)=max(0,z)", "分段非线性", "稀疏", "导数", "dead ReLU", "z=0", "Leaky-ReLU"]],
    ["gelu", ["GELU(x)=x\\Phi(x)", "不是", "抽样", "负输出", "期望", "随机门"]],
    ["training-gates", ["Loss", "反向传播", "不是人工", "-0.400", "0.213", "dL/dz", "dL/dw", "dL/db", "scalar regression", "x=1"]],
    ["negative-information", ["ReLU(z)-ReLU(-z)=z", "residual stream", "负权重", "不等于", "+1", "-1", "GELU(-1)", "可逆"]],
  ];
  required.forEach(([id, markers]) => requireMarkers(id, markers));

  const ids = [...chapter.matchAll(/<h2[^>]*id="([^"]+)"/g)].map((match) => match[1]);
  const gateIds = required.map(([id]) => id);
  assert.deepEqual(ids.filter((id) => gateIds.includes(id)), gateIds);
  assert.ok(ids.indexOf("linear-boundaries") < ids.indexOf("preactivation"));
  assert.ok(ids.indexOf("gelu") < ids.indexOf("negative-information"));
  assert.ok(ids.indexOf("negative-information") < ids.indexOf("why-nonlinearity"));

  const staticEnd = chapter.indexOf('id="negative-information"');
  const widget = chapter.indexOf('data-widget="activation-gates-viz"');
  assert.ok(widget > staticEnd, "activation-gates-viz must follow #negative-information");
  assert.ok(widget < chapter.indexOf('id="why-nonlinearity"'), "activation-gates-viz must not split static gate sections");

  const expectedAnswers = {
    preactivation: "1,24",
    "sign-is-not-meaning": "2,3,4,25,26",
    relu: "5,6,7,8",
    gelu: "9,22",
    "training-gates": "10,11,12,13,14,15",
    "bias-threshold": "16,17,18",
    "negative-information": "19,20,21,23",
  };
  for (const [id, answers] of Object.entries(expectedAnswers)) {
    assert.match(chapter, new RegExp(`<h2[^>]*id="${id}"[^>]*data-answers="${answers}"`), `#${id} exact answer mapping`);
  }
  for (let outcome = 10; outcome <= 17; outcome += 1) {
    assert.equal((chapter.match(new RegExp(`data-check="outcome-${outcome}"`, "g")) || []).length, 1, `outcome-${outcome} must appear once`);
  }
});

test("F-2.5 gate narrative keeps mathematical boundaries with their owning sections", () => {
  const preactivation = section("preactivation");
  ["score", "不是", "投影", "限制"].forEach((marker) => assert.ok(preactivation.includes(marker), `#preactivation missing ${marker}`));
  const sign = section("sign-is-not-meaning");
  ["翻转", "不等价", "feature"].forEach((marker) => assert.ok(sign.includes(marker), `#sign-is-not-meaning missing ${marker}`));
  const relu = section("relu");
  ["z<0", "严格为负", "导数正好为 0", "z>0", "仅在 z=0", "subgradient", "active", "Leaky-ReLU"].forEach((marker) => assert.ok(relu.includes(marker), `#relu missing ${marker}`));
  const gelu = section("gelu");
  ["期望", "Bernoulli", "不在运行时抽样", "f25-mobile-stack", "ReLU(x)", "-2", "1.954", "GELU'(z)=\\Phi(z)+z\\phi(z)"].forEach((marker) => assert.ok(gelu.includes(marker), `#gelu missing ${marker}`));
  const training = section("training-gates");
  ["相关", "无关", "低响应", "分布式", "损失", "间接", "dL/dz=(a-target)GELU'(z)", "dL/dw=x*dL/dz", "dL/db=dL/dz"].forEach((marker) => assert.ok(training.includes(marker), `#training-gates missing ${marker}`));
  const negative = section("negative-information");
  ["paired", "bias", "第二个 Linear", "正贡献", "旁路", "不能保证"].forEach((marker) => assert.ok(negative.includes(marker), `#negative-information missing ${marker}`));
});

test("F-2.5 frozen channel fixture is stated exactly in reader and widget copy", () => {
  const preactivation = section("preactivation");
  [
    "CHANNEL_INPUT=[1,1]",
    "CHANNEL_W=[[1,-1,0.5,-2],[1.1,0.3,0.8,-1.2]]",
    "CHANNEL_B=[0,0,0,0]",
    "[2.1,-0.7,1.3,-3.2]",
  ].forEach((marker) => assert.ok(preactivation.includes(marker), `#preactivation missing exact fixture ${marker}`));
  assert.match(activationWidgetSource, /x=\[1,1\] 的冻结通道计算/);
  assert.doesNotMatch(activationWidgetSource, /x=\[2,-1\] 的冻结通道计算/);
});

test("F-2.5 static gate fallbacks belong to their teaching sections, not the lab", () => {
  const training = section("training-gates");
  const expectedTraces = {
    relevant: [
      ["0", "-0.400", "-0.138", "-0.224", "-0.224", "-0.224", "-0.176"],
      ["1", "-0.176", "-0.076", "-0.389", "-0.389", "-0.389", "0.213"],
      ["2", "0.213", "0.125", "-0.584", "-0.584", "-0.584", "0.797"],
      ["3", "0.797", "0.628", "-0.379", "-0.379", "-0.379", "1.177"],
      ["4", "1.177", "1.036", "0.040", "0.040", "0.040", "1.137"],
    ],
    irrelevant: [
      ["0", "0.800", "0.631", "0.643", "0.643", "0.643", "0.157"],
      ["1", "0.157", "0.088", "0.055", "0.055", "0.055", "0.102"],
      ["2", "0.102", "0.055", "0.032", "0.032", "0.032", "0.070"],
      ["3", "0.070", "0.037", "0.020", "0.020", "0.020", "0.049"],
      ["4", "0.049", "0.026", "0.014", "0.014", "0.014", "0.036"],
    ],
  };
  for (const [kind, rows] of Object.entries(expectedTraces)) {
    const table = training.match(new RegExp(`<table[^>]*data-training-trace="${kind}"[^>]*>[\\s\\S]*?<\\/table>`))?.[0] || "";
    assert.ok(table, `missing ${kind} static trace table`);
    assert.match(table, /<th[^>]*>step<\/th><th[^>]*>z<\/th><th[^>]*>GELU<\/th><th[^>]*>dL\/dz<\/th><th[^>]*>dL\/dw<\/th><th[^>]*>dL\/db<\/th><th[^>]*>next z<\/th>/);
    const cells = [...table.matchAll(/<td[^>]*>([^<]+)<\/td>/g)].map((match) => match[1].trim());
    assert.deepEqual(cells, rows.flat(), `${kind} exact static trace cells`);
  }

  const threshold = section("bias-threshold");
  assert.equal((threshold.match(/agv-threshold-table/g) || []).length, 1, "threshold table must stay at #bias-threshold");
  const negative = section("negative-information");
  assert.equal((negative.match(/agv-pair-reconstruction/g) || []).length, 1, "pair reconstruction must stay at #negative-information");
  assert.match(negative, /z=-2\.500 时为 0\.000-2\.500=-2\.500/);

  const lab = chapter.match(/<div class="lab activation-gates-viz activation-gates-static"[\s\S]*?(?=<h2 id="why-nonlinearity")/)?.[0] || "";
  assert.equal((lab.match(/agv-channel-table/g) || []).length, 1, "lab must retain one static channel table");
  assert.doesNotMatch(lab, /agv-threshold-table|agv-pair-reconstruction|agv-static-traces|data-training-trace=/,
    "lab must not duplicate section-owned threshold, pair, or training fallbacks");
});

test("F-2.5 paired-ReLU explanation derives the opposite branch with a negative bias", () => {
  const negative = section("negative-information");
  assert.match(negative, /z=w\^T x\+b/);
  assert.match(negative, /\(-w\)\^T x\+\(-b\)=-z/);
  assert.match(negative, /下游.*\+1、-1/);
  assert.doesNotMatch(negative, /相同 bias/);
});

test("F-2.5 metadata and F-3 recap expose the new gate foundation exactly once", () => {
  const sandbox = { window: {} };
  vm.runInNewContext(contentSource, sandbox);
  const entry = sandbox.window.EBOOK.parts.flatMap((part) => part.sections).find((item) => item.id === "f-2-5");
  assert.equal(entry.title, "Linear、ReLU/GELU 与 MLP 从零开始");
  ["relu", "pre-activation", "bias", "gate", "dead relu"].forEach((term) => {
    assert.ok(entry.keywords.toLowerCase().includes(term), `missing metadata term ${term}`);
  });

  const recap = f3Chapter.match(/<h2[^>]*id="recap"[^>]*>[\s\S]*?(?=<h2|<\/article>)/)?.[0] || "";
  const links = [...recap.matchAll(/href="f-2-5-linear-gelu-mlp\.html#preactivation"/g)];
  assert.equal(links.length, 1, "F-3 needs exactly one #preactivation recap link");
  assert.doesNotMatch(recap, /z=w\^T x\+b|ReLU\(z\)=max/, "F-3 recap must not repeat the gate derivation");
});

test("F-2.5 recap directly links readers to the F-3 LayerNorm introduction", () => {
  const recap = section("recap");
  assert.match(recap, /<a href="f-3-transformer-block\.html#layernorm">[^<]*F-3[^<]*LayerNorm[^<]*<\/a>/);
  assert.equal((recap.match(/f-3-transformer-block\.html#layernorm/g) || []).length, 1);
});
