import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const corePath = new URL("../assets/js/widgets/mlp-basics-core.js", import.meta.url);
const coreFile = fileURLToPath(corePath);
const chapterPath = new URL("../chapters/foundations/f-2-5-linear-gelu-mlp.html", import.meta.url);

test("requiring the core in Node does not assign a browser global", () => {
  delete globalThis.EBMLPBasics;
  delete require.cache[require.resolve(coreFile)];
  const core = require(coreFile);
  assert.equal(globalThis.EBMLPBasics, undefined);
  assert.equal(typeof core.trace, "function");
});

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

test("no-activation trace composes the two affine layers", () => {
  const core = require(coreFile);
  const trace = core.traceWithoutActivation([2, -1]);
  assert.deepEqual(trace.linear1, [3, -2, 0.5, 1]);
  assert.deepEqual(trace.output.map(core.format), ["0.450", "2.000"]);
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

test("static GELU table values agree with the executable core", () => {
  const core = require(coreFile);
  const chapter = readFileSync(chapterPath, "utf8");
  const rows = [...chapter.matchAll(/data-gelu-input="([^"]+)" data-relu-value="([^"]+)" data-gelu-value="([^"]+)"/g)]
    .map((match) => ({ input: Number(match[1]), relu: match[2], gelu: match[3] }));
  assert.deepEqual(rows.map(({ input }) => input), [-2, -1, 0, 1, 2]);
  assert.deepEqual(rows.map(({ relu }) => relu), rows.map(({ input }) => core.format(core.relu(input))));
  assert.deepEqual(rows.map(({ gelu }) => gelu), rows.map(({ input }) => core.format(core.gelu(input))));
});

test("activation gate helpers expose frozen scalar math and threshold behavior", () => {
  const core = require(coreFile);
  assert.equal(core.relu(-0.7), 0);
  assert.equal(core.relu(2.1), 2.1);
  assert.ok(Math.abs(core.normalCdf(0) - 0.5) < 1e-8);
  assert.ok(Math.abs(core.normalPdf(0) - 0.3989422804) < 1e-10);
  assert.ok(Math.abs(core.geluDerivative(-0.4) - 0.197270) < 1e-6);
  const boundary = core.gate(3, 1, -3);
  const above = core.gate(3.1, 1, -3);
  assert.deepEqual(boundary, { input: 3, weight: 1, bias: -3, z: 0, relu: 0, gelu: core.gelu(0) });
  assert.ok(Math.abs(above.relu - 0.1) < 1e-12);
  assert.ok(Object.isFrozen(boundary));
  assert.equal(core.gate(0, 0, 2).z, 2, "w=0 keeps the bias threshold independent of input");
  assert.equal(core.gate(2, -1, 3).z, 1, "negative weight reverses the threshold direction");
  [-2.5, 0, 3].forEach((z) => {
    const pair = core.pairedRelu(z);
    assert.ok(Object.isFrozen(pair));
    assert.ok(Math.abs(pair.reconstructed - z) < 1e-12);
  });
});

test("channel trace derives frozen channel rows from the frozen affine fixture", () => {
  const core = require(coreFile);
  const source = readFileSync(corePath, "utf8");
  const implementation = source.match(/function channelTrace\(\) \{([\s\S]*?)\n  \}/)?.[1] || "";
  for (const value of [core.CHANNEL_INPUT, core.CHANNEL_W, ...core.CHANNEL_W, core.CHANNEL_B]) {
    assert.ok(Object.isFrozen(value), "channel fixture must be deeply frozen");
  }
  assert.deepEqual(core.CHANNEL_INPUT, [1, 1]);
  assert.deepEqual(core.CHANNEL_W, [[1, -1, 0.5, -2], [1.1, 0.3, 0.8, -1.2]]);
  assert.deepEqual(core.CHANNEL_B, [0, 0, 0, 0]);
  assert.match(implementation, /affine\(CHANNEL_INPUT, CHANNEL_W, CHANNEL_B\)/, "channelTrace must derive scores through the shared affine helper and frozen fixture");
  assert.doesNotMatch(implementation, /\[\s*2\.1\s*,\s*-0\.7\s*,\s*1\.3\s*,\s*-3\.2\s*\]/, "channelTrace must not duplicate literal scores");
  const expected = core.affine(core.CHANNEL_INPUT, core.CHANNEL_W, core.CHANNEL_B);
  const rows = core.channelTrace();
  assert.ok(Object.isFrozen(rows));
  rows.forEach((row) => assert.ok(Object.isFrozen(row)));
  assert.deepEqual(rows.map((row) => row.z), [2.1, -0.7, 1.3, -3.2]);
  assert.deepEqual(rows.map((row) => row.z), expected, "channel scores must be derived through affine from the exported fixture");
  rows.forEach((row, channel) => {
    assert.equal(row.input, core.CHANNEL_INPUT, "channel rows must retain the frozen input provenance");
    assert.deepEqual(row.weight, core.CHANNEL_W.map((weights) => weights[channel]));
    assert.equal(row.bias, core.CHANNEL_B[channel]);
  });
});

test("both complete static training tables agree cell-for-cell with the core", () => {
  const core = require(coreFile);
  const chapter = readFileSync(chapterPath, "utf8");
  const fixtures = {
    relevant: core.trainingTrace(-0.4, 0, 1, 5),
    irrelevant: core.trainingTrace(0.8, 0, 0, 5),
  };
  for (const [kind, trace] of Object.entries(fixtures)) {
    const table = chapter.match(new RegExp(`<table[^>]*data-training-trace="${kind}"[^>]*>[\\s\\S]*?<\\/table>`))?.[0] || "";
    const cells = [...table.matchAll(/<td[^>]*>([^<]+)<\/td>/g)].map((match) => match[1].trim());
    const expected = trace.flatMap((row) => [
      String(row.step),
      core.format(row.z),
      core.format(row.activation),
      core.format(row.dLossDz),
      core.format(row.dLossDw),
      core.format(row.dLossDb),
      core.format(row.nextZ),
    ]);
    assert.deepEqual(cells, expected, `${kind} static training trace must derive from core formatting`);
  }
});

test("GELU training trace captures frozen pre-update gradients and correct directions", () => {
  const core = require(coreFile);
  const relevant = core.trainingTrace(-0.4, 0, 1, 5);
  const irrelevant = core.trainingTrace(0.8, 0, 0, 5);
  [relevant, irrelevant].forEach((trace) => {
    assert.ok(Object.isFrozen(trace));
    trace.forEach((row) => {
      assert.ok(Object.isFrozen(row));
      ["step", "input", "target", "learningRate", "weight", "bias", "z", "activation", "dLossDz", "dLossDw", "dLossDb", "nextZ"].forEach((key) => assert.ok(key in row, `missing ${key}`));
    });
  });
  assert.deepEqual(relevant.map((row) => core.format(row.z)), ["-0.400", "-0.176", "0.213", "0.797", "1.177"]);
  assert.deepEqual(irrelevant.map((row) => core.format(row.z)), ["0.800", "0.157", "0.102", "0.070", "0.049"]);
  assert.deepEqual(relevant.map((row) => core.format(row.nextZ)), ["-0.176", "0.213", "0.797", "1.177", "1.137"]);
  assert.deepEqual(irrelevant.map((row) => core.format(row.nextZ)), ["0.157", "0.102", "0.070", "0.049", "0.036"]);
  assert.ok(relevant[0].dLossDz < 0 && relevant[0].dLossDw < 0 && relevant[0].dLossDb < 0);
  assert.ok(relevant[1].z > relevant[0].z);
  assert.ok(irrelevant[0].dLossDz > 0 && irrelevant[0].dLossDw > 0 && irrelevant[0].dLossDb > 0);
  assert.ok(irrelevant[1].z < irrelevant[0].z);
  assert.equal(relevant[0].dLossDw, relevant[0].dLossDb, "x=1 is the scalar teaching toy equality");
  [relevant, irrelevant].forEach((trace) => trace.forEach((row) => {
    const nextWeight = row.weight - row.learningRate * row.dLossDw;
    const nextBias = row.bias - row.learningRate * row.dLossDb;
    assert.equal(row.nextZ, row.input * nextWeight + nextBias, "next z must use the same simultaneous w/b update");
  }));
});

test("activation-gate API is equivalent through CommonJS and browser UMD", () => {
  const commonjs = require(coreFile);
  const browser = { window: {} };
  browser.window.window = browser.window;
  vm.runInNewContext(readFileSync(corePath, "utf8"), browser);
  const api = browser.window.EBMLPBasics;
  ["relu", "normalCdf", "normalPdf", "geluDerivative", "gate", "pairedRelu", "channelTrace", "trainingTrace"].forEach((name) => {
    assert.equal(typeof api[name], "function", `browser API missing ${name}`);
    assert.equal(typeof commonjs[name], "function", `CommonJS API missing ${name}`);
  });
  assert.equal(api.gate(3.1, 1, -3).relu, commonjs.gate(3.1, 1, -3).relu);
  assert.deepEqual(Array.from(api.channelTrace(), (row) => row.z), commonjs.channelTrace().map((row) => row.z));
  assert.deepEqual(Array.from(api.trainingTrace(-0.4, 0, 1, 5), (row) => api.format(row.z)), commonjs.trainingTrace(-0.4, 0, 1, 5).map((row) => commonjs.format(row.z)));
});
