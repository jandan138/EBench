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

  function affine(vector, weights, bias) {
    return bias.map((offset, column) => vector.reduce((sum, value, row) => sum + value * weights[row][column], offset));
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

  return Object.freeze({ erf, gelu, affine, trace, traceWithoutActivation, format, inputs, W1, B1, W2, B2 });
});
