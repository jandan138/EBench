/* eval-anatomy — 任意评测系统的五层通用骨架。
   点一层：看它的职责、典型产物，以及 EBench / EOS 各把这层放在哪。 */
(function () {
  window.EBWidgets["eval-anatomy"] = function (root) {
    const layers = [
      { k: "Spec", zh: "规格层", color: "accent",
        job: "声明「评什么」：task、scene、action/observation 接口、embodiment、要算哪些 metric。纯数据、不含逻辑。",
        prod: "TaskSpec / SceneSpec / ActionSpec / MetricSpec（frozen dataclass 或 YAML）",
        ebench: "隐式：任务定义散落在 GenManip 场景配置 + docs 的 26 task 列表里，没有独立的 Spec 数据类型。",
        eos: "显式独立层 core/specs/，每个概念一个 frozen dataclass。" },
      { k: "World-State", zh: "世界状态层", color: "rl",
        job: "把仿真器输出的物理量归一化成统一表示，再叠加任务语义（流程、危险、过程量），供评测读取。",
        prod: "CanonicalPhysicalState → TaskWorldState（+ PredictedFuture 供世界模型评测）",
        ebench: "obs 字典直接来自 Isaac Sim；没有「归一化物理态」抽象，评分逻辑直接读后端原始量。",
        eos: "core/state/ 两级：先归一化物理态，再 scenario pack 填语义 dict。" },
      { k: "Runtime", zh: "运行时层", color: "interactive",
        job: "驱动一个 episode：reset → 取 obs → 模型出 action → step → 记录。沉淀成可复现的证据。",
        prod: "EpisodeRunner / client-server loop → EpisodeTrace",
        ebench: "client-server：server 跑 Isaac Sim 黑盒，client 装进模型 env；支持多 worker 并行。",
        eos: "EpisodeRunner 当前单进程同步；L2 WorldSession / L3 measurement 是另起的运行时证据骨架。" },
      { k: "Metric", zh: "指标层", color: "g103",
        job: "把一条 trace 翻译成「分」。不只 success/fail，而是多个家族的诊断量。",
        prod: "Evaluator → MetricResult（task_outcome / precision / hazard / …）",
        ebench: "每 episode task score∈[0,1]（含部分分、时序条件），track score = 平均。单一标量为主。",
        eos: "9 个 MetricFamily；core 定义家族，scenario pack 实例化具体 metric。" },
      { k: "Report", zh: "报告层", color: "warn",
        job: "把指标聚合成给人看的诊断：多轴画像、热力图、迁移曲线——并写清 claim boundary。",
        prod: "CapabilityProfile（多轴）/ leaderboard / 诊断报告",
        ebench: "leaderboard 聚合 track score；README 愿景含 radar/heatmap，docs challenge 页未列出。",
        eos: "CapabilityProfile 多轴容器；强制 claim_boundary，避免单标量过度宣称。" },
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
        `<span style="font-family:var(--mono);color:var(--rl)">EBench</span><span style="color:var(--ink-soft)">${L.ebench}</span>` +
        `<span style="font-family:var(--mono);color:var(--interactive)">EOS</span><span style="color:var(--ink-soft)">${L.eos}</span>` +
        `</div>`;
    }

    wrap.appendChild(stack); wrap.appendChild(panel);
    root.appendChild(wrap);
    render();
  };
})();
