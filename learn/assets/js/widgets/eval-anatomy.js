/* eval-anatomy — 任意评测系统的五层通用骨架。
   点一层：看它的职责、典型产物，以及隐式/显式实现的差别。 */
(function () {
  window.EBWidgets["eval-anatomy"] = function (root) {
    const layers = [
      { k: "Spec", zh: "规格层", color: "accent",
        job: "声明「评什么」：task、scene、action/observation 接口、embodiment、要算哪些 metric。纯数据、不含逻辑。",
        prod: "task / scene / action schema / metric config（dataclass、JSON 或 YAML）",
        implicit: "轻量 benchmark：任务定义散落在场景配置、文档列表或脚本参数里，没有独立的 Spec 数据类型。",
        explicit: "显式框架：每个概念都有独立数据结构或 YAML，版本化、可校验、可冻结。" },
      { k: "World-State", zh: "世界状态层", color: "rl",
        job: "把仿真器输出的物理量归一化成统一表示，再叠加任务语义（流程、危险、过程量），供评测读取。",
        prod: "raw backend state → normalized state → task semantic state（可选 predicted rollout）",
        implicit: "轻量 benchmark：obs 字典直接来自后端，评分逻辑常常读取后端原始量。",
        explicit: "显式框架：先归一化物理态，再叠加任务语义，metric 只读统一状态。" },
      { k: "Runtime", zh: "运行时层", color: "interactive",
        job: "驱动一个 episode：reset → 取 obs → 模型出 action → step → 记录。沉淀成可复现的证据。",
        prod: "eval loop / client-server loop → episode trace",
        implicit: "轻量 benchmark：主循环常直接绑定后端，但可以像 EBench 一样用 client-server 隔离依赖。",
        explicit: "显式框架：运行时产出结构化 trace，并把 seed、版本、配置随 episode 一起记录。" },
      { k: "Metric", zh: "指标层", color: "g103",
        job: "把一条 trace 翻译成「分」。不只 success/fail，而是多个家族的诊断量。",
        prod: "Evaluator → MetricResult（task_outcome / precision / safety / resource / …）",
        implicit: "轻量 benchmark：每 episode 一个 task score，track score 取平均，leaderboard 以标量为主。",
        explicit: "显式框架：指标按 family 注册，既能报任务成败，也能报过程、精度、安全与资源消耗。" },
      { k: "Report", zh: "报告层", color: "warn",
        job: "把指标聚合成给人看的诊断：多轴画像、热力图、迁移曲线——并写清 claim boundary。",
        prod: "CapabilityProfile（多轴）/ leaderboard / 诊断报告",
        implicit: "轻量 benchmark：leaderboard 聚合主分；诊断图表可能作为补充材料出现。",
        explicit: "显式框架：报告以多轴 profile 为主，并显式写出 claim boundary，避免单标量过度宣称。" },
    ];
    let sel = 0;
    const c = (n) => EBW.c(n);

    const wrap = EBW.el("div", { style: "display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start" });
    const stack = EBW.el("div", { style: "flex:0 0 200px;display:flex;flex-direction:column;gap:8px" });
    const panel = EBW.el("div", { style: "flex:1;min-width:240px;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:14px 16px" });

    const btns = layers.map((L, i) => {
      const b = EBW.el("button", {
        style: "text-align:left;border:1px solid var(--border-strong);border-radius:9px;padding:10px 12px;cursor:pointer;background:var(--surface);color:var(--ink);font-family:var(--sans);transition:.12s",
      });
      b.innerHTML = `<div style="font-family:var(--mono);font-size:.72rem;color:var(--ink-faint)">L${i + 1}</div><b>${L.k}</b> <span style="color:var(--ink-faint);font-size:.8rem">${L.zh}</span>`;
      b.addEventListener("click", () => { sel = i; render(); });
      stack.appendChild(b);
      return b;
    });

    function render() {
      const L = layers[sel];
      btns.forEach((b, i) => {
        const on = i === sel;
        b.style.borderColor = on ? c(layers[i].color) : c("border-strong");
        b.style.background = on ? c(layers[i].color) + "1a" : c("surface");
        b.style.boxShadow = on ? `inset 3px 0 0 ${c(layers[i].color)}` : "none";
      });
      panel.innerHTML =
        `<div style="font-family:var(--mono);font-size:.7rem;text-transform:uppercase;letter-spacing:.6px;color:${c(L.color)};margin-bottom:4px">L${sel + 1} · ${L.zh}</div>` +
        `<div style="font-weight:600;font-size:1.05rem;margin-bottom:8px">${L.k} layer</div>` +
        `<p style="margin:0 0 10px;color:var(--ink-soft);line-height:1.6;font-size:.9rem">${L.job}</p>` +
        `<div style="font-size:.8rem;color:var(--ink-faint);margin-bottom:12px"><b style="color:var(--ink-soft)">典型产物：</b>${L.prod}</div>` +
        `<div style="display:grid;grid-template-columns:auto 1fr;gap:6px 10px;font-size:.84rem;line-height:1.5">` +
        `<span style="font-family:var(--mono);color:var(--rl)">implicit</span><span style="color:var(--ink-soft)">${L.implicit}</span>` +
        `<span style="font-family:var(--mono);color:var(--interactive)">explicit</span><span style="color:var(--ink-soft)">${L.explicit}</span>` +
        `</div>`;
    }

    wrap.appendChild(stack); wrap.appendChild(panel);
    root.appendChild(wrap);
    render();
  };
})();
