/* Transformer Block trace: four static views over one toy hidden-state tensor. */
(function () {
  window.EBWidgets["transformer-block-viz"] = function (root) {
    const rows = Object.freeze([
      Object.freeze({ token: "她", values: Object.freeze([1.2, -0.4, 0.8, 0.2]) }),
      Object.freeze({ token: "喜欢", values: Object.freeze([0.1, 1.1, -0.3, 0.7]) }),
      Object.freeze({ token: "苹果", values: Object.freeze([-0.6, 0.4, 1.3, 0.1]) }),
    ]);
    const views = [
      { label: "完整 Block", view: "block" }, // data-view: "block"
      { label: "MLP 共享", view: "mlp" }, // data-view: "mlp"
      { label: "Residual 旁路", view: "residual" }, // data-view: "residual"
      { label: "LayerNorm 轴", view: "norm" }, // data-view: "norm"
    ];
    let activeView = "block";

    const controls = EBW.el("div", {
      class: "tbv-controls",
      role: "group",
      "aria-label": "选择 Transformer Block 追踪视角",
    });
    const panel = EBW.el("div", {
      class: "tbv-panel",
      role: "region",
      "aria-live": "polite",
      "aria-atomic": "true",
    });

    function vector(values) {
      return `[${values.map((value) => value.toFixed(1)).join(", ")}]`;
    }

    function normalized(values) {
      const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
      const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;
      const scale = Math.sqrt(variance + 1e-5);
      return values.map((value) => (value - mean) / scale);
    }

    function tensor(label) {
      const wrap = EBW.el("div", { class: "tbv-tensor" });
      wrap.appendChild(EBW.el("div", { class: "tbv-tensor-head" }, `<b>${label}</b><span>shape [1, 3, 4]</span>`));
      rows.forEach((row) => {
        wrap.appendChild(EBW.el("div", { class: "tbv-tensor-row" },
          `<b>${row.token}</b><code>${vector(row.values)}</code>`));
      });
      return wrap;
    }

    function op(name, detail, kind) {
      return EBW.el("div", { class: `tbv-op ${kind ? `tbv-op-${kind}` : ""}` },
        `<b>${name}</b><span>${detail}</span>`);
    }

    function arrow(label) {
      return EBW.el("div", { class: "tbv-arrow", "aria-hidden": "true" }, `<span>→</span><small>${label || ""}</small>`);
    }

    /* Widget 懒加载晚于 book.js 首次 KaTeX；每次插入公式后对本节点再渲染一次。 */
    function typeset(el) {
      if (!window.renderMathInElement) return el;
      window.renderMathInElement(el, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
        ],
        throwOnError: false,
      });
      return el;
    }

    function formula(tex) {
      return typeset(EBW.el("p", { class: "tbv-formula" }, tex));
    }

    function renderBlock() {
      const view = EBW.el("div", { class: "tbv-view" });
      view.appendChild(EBW.el("div", { class: "tbv-view-head" },
        "<b>两次顺序更新，同一条 residual stream</b><span>每一步都保持 [B,n,d] = [1,3,4]</span>"));
      view.appendChild(tensor("H<sup>ℓ</sup> · 输入"));

      const stages = EBW.el("div", { class: "tbv-stages" });
      stages.appendChild(op("LN<sub>1</sub>", "逐行沿 d 归一化", "norm"));
      stages.appendChild(arrow());
      stages.appendChild(op("Attention", "跨位置通信，含 W<sub>O</sub>", "branch"));
      stages.appendChild(arrow("Δ<sub>A</sub>"));
      stages.appendChild(op("+ H<sup>ℓ</sup>", "第一次 residual 相加", "add"));
      stages.appendChild(arrow());
      stages.appendChild(op("LN<sub>2</sub>", "逐行沿 d 归一化", "norm"));
      stages.appendChild(arrow());
      stages.appendChild(op("MLP", "每行使用同一函数", "branch"));
      stages.appendChild(arrow("Δ<sub>M</sub>"));
      stages.appendChild(op("+ A<sup>ℓ</sup>", "第二次 residual 相加", "add"));
      view.appendChild(stages);

      const bypasses = EBW.el("div", { class: "tbv-bypasses" });
      bypasses.appendChild(EBW.el("div", { class: "tbv-bypass" }, "<b>旁路 1</b><span>H<sup>ℓ</sup> 绕过 LN<sub>1</sub> 与 Attention，直接到第一次 +</span>"));
      bypasses.appendChild(EBW.el("div", { class: "tbv-bypass" }, "<b>旁路 2</b><span>A<sup>ℓ</sup> 绕过 LN<sub>2</sub> 与 MLP，直接到第二次 +</span>"));
      view.appendChild(bypasses);
      view.appendChild(formula(
        "$A^{\\ell} = H^{\\ell} + \\mathrm{Attn}(\\mathrm{LN}_1(H^{\\ell}))$"
        + " · "
        + "$H^{\\ell+1} = A^{\\ell} + \\mathrm{MLP}(\\mathrm{LN}_2(A^{\\ell}))$"
      ));
      return view;
    }

    function renderMlp() {
      const view = EBW.el("div", { class: "tbv-view" });
      view.appendChild(EBW.el("div", { class: "tbv-view-head" },
        "<b>共享的是函数，不是输出</b><span>三行并行计算；行与行之间不在 MLP 内通信</span>"));
      view.appendChild(tensor("同一输入 tensor"));
      const mlpRows = EBW.el("div", { class: "tbv-mlp-rows" });
      rows.forEach((row, index) => {
        const item = EBW.el("div", { class: "tbv-mlp-row" });
        item.appendChild(EBW.el("div", { class: "tbv-row-input" }, `<b>${row.token}</b><code>${vector(row.values)}</code>`));
        item.appendChild(arrow());
        item.appendChild(op("同一个 MLP", "Linear → GELU → Linear", "branch"));
        item.appendChild(arrow());
        item.appendChild(EBW.el("div", { class: "tbv-row-output" }, `<b>Δ<sub>${index + 1}</sub></b><span>由本行输入决定</span>`));
        mlpRows.appendChild(item);
      });
      view.appendChild(mlpRows);
      view.appendChild(EBW.el("p", { class: "tbv-note" }, "同层的三个位置使用同一组 W<sub>1</sub>、b<sub>1</sub>、W<sub>2</sub>、b<sub>2</sub>；不同输入可以得到不同更新。"));
      return view;
    }

    function renderResidual() {
      const view = EBW.el("div", { class: "tbv-view" });
      view.appendChild(EBW.el("div", { class: "tbv-view-head" },
        "<b>原表示与分支更新走两条可辨认的路径</b><span>旁路不经过 LN 或子层计算</span>"));
      view.appendChild(tensor("x · 同一输入 tensor"));
      const routes = EBW.el("div", { class: "tbv-routes" });
      routes.appendChild(EBW.el("div", { class: "tbv-route tbv-route-bypass" },
        "<b>Identity bypass</b><span>x ──────────────────────────────┐</span><small>原 hidden state 直接传到加法</small>"));
      routes.appendChild(EBW.el("div", { class: "tbv-route tbv-route-branch" },
        "<b>计算分支 F(x)</b><span>x → LayerNorm → Attention 或 MLP ─┤</span><small>分支产生 Δ；Δ 不保证很小</small>"));
      routes.appendChild(EBW.el("div", { class: "tbv-route tbv-route-sum" },
        "<b>相加</b><span>└→ y = x + F(x)</span><small>两条路径在逐元素加法处汇合</small>"));
      view.appendChild(routes);
      view.appendChild(EBW.el("p", { class: "tbv-note" }, "线型、路径名称和公式都在区分旁路与计算分支，因此含义不依赖颜色。"));
      return view;
    }

    function renderNorm() {
      const view = EBW.el("div", { class: "tbv-view" });
      view.appendChild(EBW.el("div", { class: "tbv-view-head" },
        "<b>每个 token 行独立沿最后的 d=4 归一化</b><span>不跨 batch，也不跨 token</span>"));
      view.appendChild(tensor("X · 同一输入 tensor"));
      const normRows = EBW.el("div", { class: "tbv-norm-rows" });
      rows.forEach((row) => {
        const item = EBW.el("div", { class: "tbv-norm-row" });
        item.appendChild(EBW.el("div", { class: "tbv-row-input" }, `<b>${row.token}</b><code>${vector(row.values)}</code>`));
        item.appendChild(EBW.el("div", { class: "tbv-axis" }, "<span>沿这一行的 4 个 feature</span><b>──────── d ────────→</b>"));
        item.appendChild(EBW.el("code", { class: "tbv-normalized" }, vector(normalized(row.values))));
        normRows.appendChild(item);
      });
      view.appendChild(normRows);
      view.appendChild(formula(
        "$\\mathrm{LN}(X)[b,i,:] = \\gamma \\odot \\dfrac{X[b,i,:]-\\mu_i}{\\sqrt{\\sigma_i^2+\\epsilon}}+\\beta$"
      ));
      view.appendChild(EBW.el("p", { class: "tbv-note" }, "上方标准化数值省略 γ/β；实际 LayerNorm 会再做可学习的逐 feature 缩放和平移。"));
      return view;
    }

    const renderers = { block: renderBlock, mlp: renderMlp, residual: renderResidual, norm: renderNorm };
    const buttons = views.map(({ label, view }) => {
      const button = EBW.el("button", {
        type: "button",
        class: "tbv-view-button",
        "data-view": view,
        "aria-pressed": view === activeView ? "true" : "false",
      }, label);
      button.addEventListener("click", () => selectView(view));
      button.addEventListener("keydown", (event) => {
        const current = views.findIndex((item) => item.view === view);
        let next = current;
        if (["ArrowRight", "ArrowDown"].includes(event.key)) next = (current + 1) % views.length;
        else if (["ArrowLeft", "ArrowUp"].includes(event.key)) next = (current - 1 + views.length) % views.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = views.length - 1;
        else return;
        event.preventDefault();
        selectView(views[next].view);
        buttons[next].focus();
      });
      controls.appendChild(button);
      return button;
    });

    function selectView(view) {
      activeView = view;
      buttons.forEach((button) => {
        button.setAttribute("aria-pressed", button.dataset.view === activeView ? "true" : "false");
      });
      panel.setAttribute("aria-label", `${views.find((item) => item.view === activeView).label}视图`);
      panel.replaceChildren(renderers[activeView]());
    }

    root.appendChild(controls);
    root.appendChild(panel);
    selectView(activeView);
  };
})();
