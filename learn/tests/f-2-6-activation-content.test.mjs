import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const chapterPath = new URL("../chapters/foundations/f-2-6-activation-gates.html", import.meta.url);
const chapter = existsSync(chapterPath) ? readFileSync(chapterPath, "utf8") : "";
const contentSource = readFileSync(new URL("../content.js", import.meta.url), "utf8");
const section = (id) => chapter.match(
  new RegExp("<h2[^>]*id=\"" + id + "\"[^>]*>[\\s\\S]*?(?=<h2|</article>)"),
)?.[0].replace(/\s+/g, " ") || "";
const requireMarkers = (id, markers) => {
  const body = section(id);
  assert.ok(body, "missing #" + id);
  markers.forEach((marker) => assert.ok(body.includes(marker), "#" + id + " missing " + marker));
  return body;
};

test("F-2.6 exists as the dedicated activation and gate chapter", () => {
  assert.ok(existsSync(chapterPath), "F-2.6 activation chapter missing");
  assert.match(chapter, /data-section="f-2-6"/);
  const positions = [
    "start", "preactivation", "sign-is-not-meaning", "relu", "bias-threshold",
    "gelu", "negative-information", "training-gates", "checkpoint", "recap",
  ].map((id) => chapter.indexOf("id=\"" + id + "\""));
  positions.forEach((position) => assert.ok(position >= 0));
  assert.deepEqual([...positions].sort((left, right) => left - right), positions);
});

test("F-2.6 repairs the row-vector and channel-vector notation bridge", () => {
  const start = requireMarkers("start", ["hidden state x", "pre-activation z", "activation a"]);
  assert.match(start, /不要说“token 被推成正数”/);
  assert.match(start, /class="f26-object-grid"/);
  const preactivation = requireMarkers("preactivation", ["xW+b", "w^T x+b", "同一件事", "z_1=1(1)+1(1.1)+0=2.1"]);
  assert.match(preactivation, /affine/);
  assert.ok(chapter.indexOf('id="preactivation"') < chapter.indexOf('id="sign-is-not-meaning"'));
});

test("F-2.6 distinguishes sign convention, nonlinearity, bias, and gate behavior", () => {
  const sign = requireMarkers("sign-is-not-meaning", ["不天然表示", "正半轴", "约定", "-w"]);
  assert.match(sign, /不是.*正确/);
  const relu = requireMarkers("relu", ["ReLU(z)=max(0,z)", "非线性", "门控", "稀疏性"]);
  assert.match(relu, /镜像门/);
  const bias = requireMarkers("bias-threshold", ["ReLU(x-3)", "w=0", "负 w", "w^Tx+b=0"]);
  assert.match(bias, /门槛/);
});

test("F-2.6 gives GELU its intuition before optional probability math", () => {
  const gelu = requireMarkers("gelu", ["GELU", "平滑", "逐元素", "没有可学习矩阵", "optional 数学补充"]);
  assert.ok(gelu.indexOf("先看数值") < gelu.indexOf("optional 数学补充"));
  ["-2", "-1", "0", "1", "2"].forEach((input) => {
    assert.match(gelu, new RegExp("data-gelu-input=\"" + input + "\""));
  });
  assert.match(gelu, /<svg[^>]*role="img"[^>]*aria-labelledby="f26-gelu-curve-title f26-gelu-curve-desc"/);
  assert.match(gelu, /GELU\(x\)=x\\Phi\(x\)/);
});

test("F-2.6 keeps negative information and training claims carefully bounded", () => {
  const negative = requireMarkers("negative-information", ["ReLU(z)-ReLU(-z)=z", "不等于", "GELU(-1)", "F-3 的 Residual"]);
  assert.match(negative, /不是说每个真实网络/);
  const training = requireMarkers("training-gates", ["Loss", "W 和 b", "w_new=w-η", "target", "optional"]);
  assert.match(training, /不应误读/);
  assert.match(training, /GELU 在小段负区间/);
});

test("F-2.6 maps all requested activation questions and owns activation search metadata", () => {
  const answers = [...chapter.matchAll(/data-answers="([^"]+)"/g)]
    .flatMap((match) => match[1].split(","))
    .map(Number)
    .sort((left, right) => left - right);
  assert.deepEqual([...new Set(answers)], Array.from({ length: 26 }, (_, index) => index + 1));
  const sandbox = { window: {} };
  vm.runInNewContext(contentSource, sandbox);
  const entry = sandbox.window.EBOOK.flat.find((sectionEntry) => sectionEntry.id === "f-2-6");
  assert.match(entry.title, /ReLU.*GELU/);
  ["relu", "gelu", "bias", "gate", "pre-activation"].forEach((keyword) => {
    assert.ok(entry.keywords.toLowerCase().includes(keyword), "metadata keyword missing: " + keyword);
  });
});
