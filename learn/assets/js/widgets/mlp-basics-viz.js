(function () {
  "use strict";
  window.EBWidgets = window.EBWidgets || {};

  window.EBWidgets["mlp-basics-viz"] = function (root) {
    if (root.querySelector(".mbv-view-controls")) return;
    const core = window.EBMLPBasics;
    const views = [
      ["linear", "Linear 1"], ["gelu", "GELU"], ["mlp", "完整 MLP"], ["shared", "参数共享"],
    ];
    let active = "linear";

    root.innerHTML = `<div class="mbv-view-controls" role="group" aria-label="实验视图">${views.map(([id, label]) => `<button type="button" class="mbv-view-button" data-view="${id}" aria-pressed="${id === active}">${label}</button>`).join("")}</div><div class="mbv-stage"></div><div class="mbv-status" role="status" aria-live="polite" aria-atomic="true"></div>`;
    const stage = root.querySelector(".mbv-stage");
    const status = root.querySelector(".mbv-status");
    const buttons = [...root.querySelectorAll(".mbv-view-button")];
    const vector = (items) => `[${items.map(core.format).join(", ")}]`;
    const announce = (message) => { status.textContent = message; };
    const equations = [
      "2(1)+(-1)(-1)+0=3", "2(0)+(-1)(2)+0=-2", "2(0.5)+(-1)(0.5)+0=0.5", "2(0.25)+(-1)(-0.50)+0=1",
    ];

    function linear() {
      const trace = core.trace(core.inputs[0]);
      stage.innerHTML = `<div class="mbv-view"><div class="mbv-view-head"><b>Linear 1：选择输出列</b><span>输入 [2, -1]，W1 的列决定输出</span></div><div class="mbv-output-group" role="group" aria-label="Linear 1 输出列">${equations.map((equation, index) => `<button type="button" class="mbv-output" aria-pressed="${index === 0}" data-index="${index}"><b>y${index + 1}</b><code>${equation}</code></button>`).join("")}</div><p class="mbv-note">每一列都读取两个输入 feature，再加自己的 bias。</p></div>`;
      stage.querySelectorAll(".mbv-output").forEach((button) => button.addEventListener("click", () => {
        stage.querySelectorAll(".mbv-output").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
        const index = Number(button.dataset.index);
        announce(`Linear 1：y${index + 1} 输出 ${core.format(trace.linear1[index])}。`);
      }));
      announce(`Linear 1 视图：y1 输出 ${core.format(trace.linear1[0])}。`);
    }

    function curvePath() {
      const points = [];
      for (let x = -3; x <= 3.001; x += 0.1) points.push(`${40 + (x + 3) * 70},${120 - core.gelu(x) * 30}`);
      return points.join(" ");
    }

    function gelu() {
      stage.innerHTML = `<div class="mbv-view"><div class="mbv-view-head"><b>GELU：精确定义 xΦ(x)</b><span>数值由 erf 近似计算</span></div><div class="mbv-gelu-layout"><div class="mbv-gelu-control"><label for="mbv-gelu-range">GELU 输入 <output id="mbv-gelu-input">0.000</output></label><input id="mbv-gelu-range" type="range" min="-3" max="3" step="0.1" value="0"><p>输出 <output id="mbv-gelu-output">0.000</output></p><p class="mbv-note">负输入可产生负输出；负半轴一小段并非单调。</p></div><svg class="mbv-gelu-svg" viewBox="0 0 500 200" role="img" aria-label="GELU 从负三到三的曲线和当前输入点"><line x1="40" y1="120" x2="470" y2="120"></line><line x1="250" y1="20" x2="250" y2="180"></line><polyline points="${curvePath()}" fill="none"></polyline><circle class="mbv-gelu-point" cx="250" cy="120" r="6"></circle></svg></div><table class="mbv-gelu-table"><thead><tr><th>输入</th><th>GELU 近似值</th></tr></thead><tbody>${[-2, -1, 0, 1, 2].map((x) => `<tr><td data-label="输入">${x}</td><td data-label="GELU 近似值">${core.format(core.gelu(x))}</td></tr>`).join("")}</tbody></table></div>`;
      const range = stage.querySelector("#mbv-gelu-range");
      range.addEventListener("input", () => {
        const x = Number(range.value), y = core.gelu(x);
        stage.querySelector("#mbv-gelu-input").value = core.format(x);
        stage.querySelector("#mbv-gelu-output").value = core.format(y);
        const point = stage.querySelector(".mbv-gelu-point");
        point.setAttribute("cx", 40 + (x + 3) * 70);
        point.setAttribute("cy", 120 - y * 30);
        announce(`GELU 输入 ${core.format(x)}，输出 ${core.format(y)}。`);
      });
      announce("GELU 视图：输入 0.000，输出 0.000。");
    }

    function mlp() {
      const trace = core.trace(core.inputs[0]);
      const withoutActivation = core.traceWithoutActivation(core.inputs[0]);
      stage.innerHTML = `<div class="mbv-view"><div class="mbv-view-head"><b>完整 MLP：2 → 4 → 4 → 2</b><span>同一条向量逐阶段移动</span></div><label class="mbv-check"><input type="checkbox" class="mbv-no-gelu"> 去掉 GELU，比较 affine collapse</label><div class="mbv-flow"><div class="mbv-band"><b>输入 · [2]</b><code>${vector(trace.input)}</code></div><div class="mbv-band"><b>Linear 1 · [4]</b><code>${vector(trace.linear1)}</code></div><div class="mbv-band mbv-activation"><b>GELU · [4]</b><code>${vector(trace.activated)}</code></div><div class="mbv-band"><b>Linear 2 · [2]</b><code class="mbv-mlp-output">${vector(trace.output)}</code></div></div><p class="mbv-note mbv-mlp-note">保留 GELU 时，本例输出 ${vector(trace.output)}；整体通常不能合并为一次 affine，特殊参数仍可能碰巧得到 affine。</p></div>`;
      stage.querySelector(".mbv-no-gelu").addEventListener("change", (event) => {
        const disabled = event.target.checked;
        const output = disabled ? withoutActivation.output : trace.output;
        stage.querySelector(".mbv-activation").classList.toggle("mbv-disabled", disabled);
        stage.querySelector(".mbv-mlp-output").textContent = vector(output);
        stage.querySelector(".mbv-mlp-note").textContent = disabled
          ? `去掉 GELU 后，本例输出 ${vector(output)}；两次 affine 总能合并为一次。`
          : `保留 GELU 时，本例输出 ${vector(output)}；整体通常不能合并为一次 affine，特殊参数仍可能碰巧得到 affine。`;
        announce(`${disabled ? "去掉" : "保留"} GELU，输出 ${vector(output)}。`);
      });
      announce(`完整 MLP 视图：保留 GELU，输出 ${vector(trace.output)}。`);
    }

    function shared() {
      const names = ["她", "喜欢", "苹果"];
      stage.innerHTML = `<div class="mbv-view"><div class="mbv-view-head"><b>同层参数共享</b><span>[B,n,d] 可向量化批量实现</span></div><div class="mbv-token-group" role="group" aria-label="token hidden state">${names.map((name, index) => `<button type="button" class="mbv-token" data-index="${index}" aria-pressed="${index === 0}">${name}</button>`).join("")}</div><div class="mbv-shared-grid"><div class="mbv-parameter-display"><b>所有 token 使用相同参数</b><code>W1 / B1 / W2 / B2</code><span>dense 层如此；MoE 可按路由选择专家。</span></div><div class="mbv-token-trace"></div></div><p class="mbv-note">批量形状 [3,2] → [3,4] → [3,2]；向量化不表示 token 行之间交换数据。</p></div>`;
      const tokens = [...stage.querySelectorAll(".mbv-token")];
      const renderToken = (index) => {
        tokens.forEach((item, itemIndex) => item.setAttribute("aria-pressed", String(itemIndex === index)));
        const trace = core.trace(core.inputs[index]);
        stage.querySelector(".mbv-token-trace").innerHTML = `<b>${names[index]}</b><div class="mbv-flow"><code>${vector(trace.input)}</code><span>→</span><code>${vector(trace.linear1)}</code><span>→</span><code>${vector(trace.activated)}</code><span>→</span><code class="mbv-shared-output">${vector(trace.output)}</code></div>`;
        announce(`参数共享：${names[index]} 输出 ${vector(trace.output)}。`);
      };
      tokens.forEach((button, index) => button.addEventListener("click", () => renderToken(index)));
      renderToken(0);
    }

    const renderers = { linear, gelu, mlp, shared };
    function select(index, focus) {
      active = views[index][0];
      buttons.forEach((button, itemIndex) => button.setAttribute("aria-pressed", String(itemIndex === index)));
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
