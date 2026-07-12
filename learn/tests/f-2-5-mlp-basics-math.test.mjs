import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const corePath = new URL("../assets/js/widgets/mlp-basics-core.js", import.meta.url);
const coreFile = fileURLToPath(corePath);
const chapterPath = new URL("../chapters/foundations/f-2-5-linear-gelu-mlp.html", import.meta.url);

test("MLP math core exists and exposes deterministic exact-GELU arithmetic", () => {
  assert.ok(existsSync(corePath), "missing mlp-basics-core.js");
  const core = require(coreFile);
  assert.deepEqual(core.affine([2, -1], core.W1, core.B1), [3, -2, 0.5, 1]);
  assert.ok(Math.abs(core.gelu(3) - 2.995950098) < 1e-6);
  assert.ok(Math.abs(core.gelu(-2) + 0.045500126) < 1e-6);
  const first = core.trace([2, -1]);
  assert.ok(Math.abs(first.output[0] - 0.614224903) < 1e-6);
  assert.ok(Math.abs(first.output[1] - 1.529029732) < 1e-6);
  assert.equal(core.format(0.00001), "0.000");
  assert.equal(core.format(-0.045500126), "-0.046");
});

test("public inputs, parameters, and traces are frozen and shape-safe", () => {
  const core = require(coreFile);
  for (const value of [core.inputs, ...core.inputs, core.W1, ...core.W1, core.B1, core.W2, ...core.W2, core.B2]) {
    assert.ok(Object.isFrozen(value), "public numeric data must be deeply frozen");
  }
  const traces = core.inputs.map(core.trace);
  traces.forEach((trace) => {
    assert.deepEqual([trace.input.length, trace.linear1.length, trace.activated.length, trace.output.length], [2, 4, 4, 2]);
    assert.ok([trace.input, trace.linear1, trace.activated, trace.output].flat().every(Number.isFinite));
    assert.equal(trace.parameters.W1, core.W1);
    assert.equal(trace.parameters.B1, core.B1);
    assert.equal(trace.parameters.W2, core.W2);
    assert.equal(trace.parameters.B2, core.B2);
  });
  assert.ok(new Set(traces.map(({ output }) => output.join(","))).size >= 2);
});

test("static trace data values agree with the executable core", () => {
  const core = require(coreFile);
  const chapter = readFileSync(chapterPath, "utf8");
  const values = [...chapter.matchAll(/data-value="([^"]+)"/g)].map((match) => match[1].split(",").map(Number));
  const trace = core.trace(core.inputs[0]);
  assert.equal(values.length, 4);
  [trace.input, trace.linear1, trace.activated, trace.output].forEach((expected, index) => {
    assert.equal(values[index].length, expected.length);
    expected.forEach((number, item) => assert.ok(Math.abs(values[index][item] - number) <= 0.001));
  });
});
