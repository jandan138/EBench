import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const chapterPath = new URL("../chapters/foundations/f-2-5-linear-gelu-mlp.html", import.meta.url);
const chapter = existsSync(chapterPath) ? readFileSync(chapterPath, "utf8") : "";
const corePath = new URL("../assets/js/widgets/mlp-basics-core.js", import.meta.url);
const widgetPath = new URL("../assets/js/widgets/mlp-basics-viz.js", import.meta.url);
const cssPath = new URL("../assets/css/book.css", import.meta.url);
const cssSource = readFileSync(cssPath, "utf8");
const contentSource = readFileSync(new URL("../content.js", import.meta.url), "utf8");
const f26Chapter = readFileSync(new URL("../chapters/foundations/f-2-6-activation-gates.html", import.meta.url), "utf8");
const section = (id) => chapter.match(
  new RegExp("<h2[^>]*id=\"" + id + "\"[^>]*>[\\s\\S]*?(?=<h2|</article>)"),
)?.[0].replace(/\s+/g, " ") || "";
const requireMarkers = (id, markers) => {
  const body = section(id);
  assert.ok(body, "missing #" + id);
  markers.forEach((marker) => assert.ok(body.includes(marker), "#" + id + " missing " + marker));
  return body;
};
const assertInOrder = (ids) => {
  const positions = ids.map((id) => chapter.indexOf("id=\"" + id + "\""));
  positions.forEach((position, index) => assert.ok(position >= 0, "missing #" + ids[index]));
  assert.deepEqual([...positions].sort((left, right) => left - right), positions, "F-2.5 story order regressed");
};

test("F-2.5 gives the core MLP journey before the activation deep dive", () => {
  assertInOrder([
    "start", "function", "scalar-linear", "vector-linear", "linear-boundaries",
    "gelu-bridge", "why-nonlinearity", "mlp-trace", "shared-mlp",
    "attention-bridge", "training", "checkpoint", "recap", "activation-moved",
  ]);
  assert.ok(chapter.indexOf('id="mlp-trace"') < chapter.indexOf('id="activation-moved"'));
  assert.ok(!/<h2[^>]*id="preactivation"/.test(chapter), "activation theory must not interrupt the core MLP route");
});

test("F-2.5 establishes Linear with substitutions before matrix notation", () => {
  const scalar = requireMarkers("scalar-linear", ["x=3", "w=2", "b=1", "2(3)+1=7", "y=wx+b"]);
  assert.ok(scalar.indexOf("2(3)+1=7") < scalar.indexOf("y=wx+b"));
  const vector = requireMarkers("vector-linear", ["矩阵写法", "y=xW+b", "W:[d_in,d_out]", "输入 feature", "输出 feature"]);
  ["y_1=x_1w_{11}+x_2w_{21}+b_1", "y_2=x_1w_{12}+x_2w_{22}+b_2", "y_3=x_1w_{13}+x_2w_{23}+b_3", "y_4=x_1w_{14}+x_2w_{24}+b_4"]
    .forEach((equation) => assert.ok(vector.includes(equation), "missing " + equation));
  assert.ok(vector.indexOf("矩阵写法") < vector.indexOf("y=xW+b"));
});

test("F-2.5 explains the GELU bridge and why the MLP needs it before the numeric trace", () => {
  const bridge = requireMarkers("gelu-bridge", ["固定", "逐元素", "不在 token 位置之间通信", "没有另一套可学习矩阵"]);
  assert.match(bridge, /F-2\.6/);
  const nonlinearity = requireMarkers("why-nonlinearity", ["两次连续 affine", "W_*=W_1W_2", "不能普遍合并"]);
  assert.ok(chapter.indexOf('id="why-nonlinearity"') < chapter.indexOf('id="mlp-trace"'));
  assert.ok(nonlinearity.includes("不同区域"));
});

test("F-2.5 keeps the deterministic complete MLP trace and shared-function explanation", () => {
  const trace = requireMarkers("mlp-trace", ["2 → 4 → 2", "W1", "B1", "W2", "B2"]);
  ["2,-1", "3,-2,0.5,1", "2.996,-0.046,0.346,0.841", "0.614,1.529"].forEach((value) => {
    assert.match(trace, new RegExp("data-value=\"" + value + "\""), "trace value missing: " + value);
  });
  const shared = requireMarkers("shared-mlp", ["同一组 W1、B1、W2、B2", "参数共享不意味着输出相同", "同一个计算规则"]);
  assert.match(shared, /不同输入/);
  const bridge = requireMarkers("attention-bridge", ["Attention 负责", "MLP 负责", "共同塑造"]);
  assert.match(bridge, /不夸张/);
  const training = requireMarkers("training", ["Loss", "反向传播", "优化器", "F-2.6"]);
  assert.doesNotMatch(training, /dL\/dz/);
});

test("F-2.5 preserves old activation anchors as visible migration destinations", () => {
  ["preactivation", "sign-is-not-meaning", "bias-threshold", "relu", "gelu", "training-gates", "negative-information"].forEach((id) => {
    assert.match(chapter, new RegExp("<a id=\"" + id + "\"[^>]*aria-hidden=\"true\""), "compatibility #" + id + " missing");
  });
  const moved = requireMarkers("activation-moved", ["F-2.6", "旧链接不会变成 404"]);
  assert.match(moved, /f-2-6-activation-gates\.html#start/);
  assert.match(section("recap"), /f-2-6-activation-gates\.html#start/);
  assert.match(f26Chapter, /id="preactivation"/);
  assert.match(chapter, /legacyActivationAnchors/);
  assert.match(chapter, /f-2-6-activation-gates\.html#/);
});

test("F-2.5 wires only the MLP widget and retains scoped mobile source contracts", () => {
  assert.ok(existsSync(corePath));
  assert.ok(existsSync(widgetPath));
  assert.ok(chapter.indexOf("mlp-basics-core.js") < chapter.indexOf("mlp-basics-viz.js"));
  assert.ok(chapter.indexOf("mlp-basics-viz.js") < chapter.indexOf("book.js"));
  assert.doesNotMatch(chapter, /activation-gates-viz\.js/);
  assert.match(chapter, /data-widget="mlp-basics-viz"/);
  assert.match(cssSource, /body\[data-section="f-2-5"\]\s+\.article\s+\.f25-flow/);
  const mobile = cssSource.match(/@media \(max-width: 560px\) \{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(mobile, /body\[data-section="f-2-5"\]\s+\.article\s+table\.f25-mobile-stack/);
});

test("F-2.5 metadata now names only the core MLP lesson", () => {
  const sandbox = { window: {} };
  vm.runInNewContext(contentSource, sandbox);
  const entry = sandbox.window.EBOOK.flat.find((sectionEntry) => sectionEntry.id === "f-2-5");
  assert.match(entry.title, /Linear.*MLP/);
  assert.doesNotMatch(entry.title, /ReLU/);
  ["linear", "mlp", "d_ff", "共享"].forEach((keyword) => {
    assert.ok(entry.keywords.toLowerCase().includes(keyword.toLowerCase()), "missing metadata keyword: " + keyword);
  });
});
