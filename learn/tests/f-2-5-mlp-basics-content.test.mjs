import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const chapterPath = new URL("../chapters/foundations/f-2-5-linear-gelu-mlp.html", import.meta.url);
const chapter = existsSync(chapterPath) ? readFileSync(chapterPath, "utf8") : "";
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
