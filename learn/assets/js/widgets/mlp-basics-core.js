(function (factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else if (typeof window === "object" && window.window === window) {
    window.EBMLPBasics = api;
  }
})(function () {
  "use strict";

  const freezeMatrix = (rows) => Object.freeze(rows.map((row) => Object.freeze(row.slice())));
  const inputs = freezeMatrix([[2, -1], [1, 2], [-1, 1]]);
  const W1 = freezeMatrix([[1, 0, 0.5, 0.25], [-1, 2, 0.5, -0.5]]);
  const B1 = Object.freeze([0, 0, 0, 0]);
  const W2 = freezeMatrix([[0.2, 0.4], [0.1, -0.2], [0.3, 0.2], [-0.1, 0.3]]);
  const B2 = Object.freeze([0, 0]);
  const parameters = Object.freeze({ W1, B1, W2, B2 });
  const CHANNEL_INPUT = Object.freeze([2, -1]);
  const CHANNEL_W = freezeMatrix([[1, -0.5, 0.75, -1], [-0.1, 0.3, 0.2, 1.2]]);
  const CHANNEL_B = Object.freeze([0, 0.6, 0, 0]);

  function erf(value) {
    const sign = value < 0 ? -1 : 1;
    const x = Math.abs(value);
    const t = 1 / (1 + 0.3275911 * x);
    const polynomial = (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
    return sign * (1 - polynomial * Math.exp(-x * x));
  }

  function gelu(value) {
    return value * 0.5 * (1 + erf(value / Math.sqrt(2)));
  }

  function normalCdf(value) {
    return 0.5 * (1 + erf(value / Math.sqrt(2)));
  }

  function normalPdf(value) {
    return Math.exp(-0.5 * value * value) / Math.sqrt(2 * Math.PI);
  }

  function relu(value) {
    return Math.max(0, value);
  }

  function geluDerivative(value) {
    return normalCdf(value) + value * normalPdf(value);
  }

  function affine(vector, weights, bias) {
    return bias.map((offset, column) => vector.reduce((sum, value, row) => sum + value * weights[row][column], offset));
  }

  function gate(input, weight, bias) {
    const z = input * weight + bias;
    return Object.freeze({ input, weight, bias, z, relu: relu(z), gelu: gelu(z) });
  }

  function pairedRelu(z) {
    const positive = relu(z);
    const opposite = relu(-z);
    return Object.freeze({ z, positive, opposite, reconstructed: positive - opposite });
  }

  function channelTrace() {
    const scores = affine(CHANNEL_INPUT, CHANNEL_W, CHANNEL_B);
    return Object.freeze(scores.map((z, channel) => Object.freeze({
      channel: channel + 1,
      input: CHANNEL_INPUT,
      weight: Object.freeze(CHANNEL_W.map((row) => row[channel])),
      bias: CHANNEL_B[channel],
      z,
      relu: relu(z),
      gelu: gelu(z),
    })));
  }

  function trainingTrace(initialWeight, initialBias, target, steps = 5, learningRate = 0.5) {
    const input = 1;
    let weight = initialWeight;
    let bias = initialBias;
    const rows = [];
    for (let step = 0; step < steps; step += 1) {
      const z = input * weight + bias;
      const activation = gelu(z);
      const dLossDz = (activation - target) * geluDerivative(z);
      const dLossDw = input * dLossDz;
      const dLossDb = dLossDz;
      rows.push(Object.freeze({ step, input, target, learningRate, weight, bias, z, activation, dLossDz, dLossDw, dLossDb }));
      weight -= learningRate * dLossDw;
      bias -= learningRate * dLossDb;
    }
    return Object.freeze(rows);
  }

  function trace(vector) {
    const input = Object.freeze(vector.slice());
    const linear1 = Object.freeze(affine(input, W1, B1));
    const activated = Object.freeze(linear1.map(gelu));
    const output = Object.freeze(affine(activated, W2, B2));
    return Object.freeze({ input, linear1, activated, output, parameters });
  }

  function traceWithoutActivation(vector) {
    const input = Object.freeze(vector.slice());
    const linear1 = Object.freeze(affine(input, W1, B1));
    const output = Object.freeze(affine(linear1, W2, B2));
    return Object.freeze({ input, linear1, output, parameters });
  }

  function format(value) {
    const rounded = Math.abs(value) < 0.0005 ? 0 : value;
    return rounded.toFixed(3);
  }

  return Object.freeze({
    erf, gelu, normalCdf, normalPdf, relu, geluDerivative, affine, gate, pairedRelu, channelTrace, trainingTrace,
    trace, traceWithoutActivation, format, inputs, W1, B1, W2, B2, CHANNEL_INPUT, CHANNEL_W, CHANNEL_B,
  });
});
