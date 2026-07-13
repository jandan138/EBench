(function () {
  "use strict";
  window.EBWidgets = window.EBWidgets || {};

  window.EBWidgets["activation-gates-viz"] = function (root) {
    if (root.querySelector(".agv-view-controls")) return;
    const core = window.EBMLPBasics;
    const views = [
      ["channels", "通道"], ["threshold", "阈值"], ["pair", "配对"], ["training", "训练"],
    ];
    // Source contracts: data-view: "channels"; data-view: "threshold"; data-view: "pair"; data-view: "training".
    let active = "channels";

    root.innerHTML = `<div class="agv-view-controls" role="group" aria-label="激活门控视图">${views.map(([id, label]) => `<button type="button" class="agv-view-button" data-view="${id}" aria-pressed="${id === active}">${label}</button>`).join("")}</div><div class="agv-stage"></div><div class="agv-status" role="status" aria-live="polite" aria-atomic="true"></div>`;
    const stage = root.querySelector(".agv-stage");
    const status = root.querySelector(".agv-status");
    const buttons = [...root.querySelectorAll(".agv-view-button")];
    const value = (number) => core.format(number);
    const announce = (message) => { status.textContent = message; };

    function channels() {
      const rows = core.channelTrace();
      stage.innerHTML = `<div class="agv-view"><div class="agv-view-head"><b>通道先得到 affine score</b><span>x=[1,1] 的冻结通道计算</span></div><div class="agv-grid agv-channel-grid"><table><thead><tr><th>通道</th><th>z</th><th>ReLU(z)</th><th>GELU(z)</th></tr></thead><tbody>${rows.map((row) => `<tr><td>c${row.channel}</td><td class="agv-channel-z">${value(row.z)}</td><td class="agv-channel-relu">${value(row.relu)}</td><td class="agv-channel-gelu">${value(row.gelu)}</td></tr>`).join("")}</tbody></table><p class="agv-note">正负号不是“有用”或“无用”的标签；这些数值来自同一 affine 计算，不能给通道指定固定的人类语义。</p></div></div>`;
      announce("通道视图：四个 score 比较 ReLU 与 GELU。");
    }

    function threshold() {
      stage.innerHTML = `<div class="agv-view"><div class="agv-view-head"><b>阈值来自 z=wx+b</b><span>初始值展示 ReLU(x-3)</span></div><div class="agv-grid agv-threshold-layout"><div class="agv-controls"><div><label for="agv-input">输入 x</label><input id="agv-input" type="range" min="-4" max="6" step="1" value="3"><output class="agv-input-value">3.000</output></div><div><label for="agv-weight">权重 w</label><input id="agv-weight" type="range" min="-2" max="2" step="1" value="1"><output class="agv-weight-value">1.000</output></div><div><label for="agv-bias">偏置 b</label><input id="agv-bias" type="range" min="-4" max="4" step="1" value="-3"><output class="agv-bias-value">-3.000</output></div></div><div class="agv-results"><p>z = <output class="agv-threshold-z">0.000</output></p><p>ReLU(z) = <output class="agv-threshold-relu">0.000</output></p><p class="agv-threshold-rule"></p></div></div></div>`;
      const input = stage.querySelector("#agv-input");
      const weight = stage.querySelector("#agv-weight");
      const bias = stage.querySelector("#agv-bias");
      const update = () => {
        const result = core.gate(Number(input.value), Number(weight.value), Number(bias.value));
        stage.querySelector(".agv-input-value").value = value(result.input);
        stage.querySelector(".agv-weight-value").value = value(result.weight);
        stage.querySelector(".agv-bias-value").value = value(result.bias);
        stage.querySelector(".agv-threshold-z").value = value(result.z);
        stage.querySelector(".agv-threshold-relu").value = value(result.relu);
        stage.querySelector(".agv-threshold-rule").textContent = result.weight === 0
          ? "w=0 时 z 只由 b 决定，输入 x 不再移动边界。"
          : result.weight < 0
            ? "负 w 会反转一维不等式的方向；边界仍由 z=0 给出。"
            : "正 w 时，增大 x 会增大 z；当前初始值是 ReLU(x-3)。";
        announce(`阈值视图：z 为 ${value(result.z)}，ReLU 为 ${value(result.relu)}。`);
      };
      [input, weight, bias].forEach((control) => control.addEventListener("input", update));
      update();
    }

    function pair() {
      stage.innerHTML = `<div class="agv-view"><div class="agv-view-head"><b>一对 ReLU 可以重构 z</b><span>并不保证模型实际这样配对</span></div><div class="agv-grid agv-pair-layout"><div class="agv-controls"><label for="agv-pair">配对输入 z</label><input id="agv-pair" type="range" min="-3" max="3" step="0.1" value="-2.5"><output class="agv-pair-input">-2.500</output></div><div class="agv-results"><p>ReLU(z) = <output class="agv-pair-positive">0.000</output></p><p>ReLU(-z) = <output class="agv-pair-opposite">0.000</output></p><p>ReLU(z)-ReLU(-z) = <output class="agv-pair-reconstructed">-2.500</output></p></div></div><p class="agv-note agv-pair-note">这只构造出一个可重构的成对分支，不保证每个模型都会使用这种配对。</p></div>`;
      const input = stage.querySelector("#agv-pair");
      const update = () => {
        const result = core.pairedRelu(Number(input.value));
        stage.querySelector(".agv-pair-input").value = value(result.z);
        stage.querySelector(".agv-pair-positive").value = value(result.positive);
        stage.querySelector(".agv-pair-opposite").value = value(result.opposite);
        stage.querySelector(".agv-pair-reconstructed").value = value(result.reconstructed);
        announce(`配对视图：重构 ${value(result.reconstructed)}。`);
      };
      input.addEventListener("input", update);
      update();
    }

    function training() {
      const choices = {
        relevant: { label: "相关", trace: core.trainingTrace(-0.4, 0, 1, 5) },
        irrelevant: { label: "无关", trace: core.trainingTrace(0.8, 0, 0, 5) },
      };
      stage.innerHTML = `<div class="agv-view"><div class="agv-view-head"><b>冻结的教学 trace</b><span>显示更新前行，不在浏览器训练模型</span></div><div class="agv-training-controls" role="group" aria-label="训练 trace"><button type="button" class="agv-training-choice" data-trace="relevant" aria-pressed="true">相关 target=1</button><button type="button" class="agv-training-choice" data-trace="irrelevant" aria-pressed="false">无关 target=0</button></div><div class="agv-trace"></div><p class="agv-note">更新规则：w,b 分别减去学习率乘以 dL/dw、dL/db。两条 trace 独立；相关 z 上升，无关 z 向低响应移动。</p></div>`;
      const controls = [...stage.querySelectorAll(".agv-training-choice")];
      const traceRoot = stage.querySelector(".agv-trace");
      const render = (id) => {
        const selected = choices[id];
        controls.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.trace === id)));
        traceRoot.innerHTML = selected.trace.map((row) => `<div class="agv-trace-row"><b>step ${row.step}</b><span>z <output class="agv-training-z">${value(row.z)}</output></span><span>GELU ${value(row.activation)}</span><span>dL/dz ${value(row.dLossDz)}</span></div>`).join("");
        announce(`${selected.label} trace：${selected.label === "相关" ? "z 上升" : "z 向低响应移动"}。`);
      };
      controls.forEach((button) => button.addEventListener("click", () => render(button.dataset.trace)));
      render("relevant");
    }

    const renderers = { channels, threshold, pair, training };
    function select(index, focus) {
      active = views[index][0];
      buttons.forEach((button, buttonIndex) => button.setAttribute("aria-pressed", String(buttonIndex === index)));
      renderers[active]();
      if (focus) buttons[index].focus();
    }

    buttons.forEach((button, index) => {
      button.addEventListener("click", () => select(index, true));
      button.addEventListener("keydown", (event) => {
        let next = null;
        if (["ArrowRight", "ArrowDown"].includes(event.key)) next = (index + 1) % buttons.length;
        if (["ArrowLeft", "ArrowUp"].includes(event.key)) next = (index - 1 + buttons.length) % buttons.length;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = buttons.length - 1;
        if (next !== null) { event.preventDefault(); select(next, true); }
      });
    });
    select(0, false);
  };
})();
