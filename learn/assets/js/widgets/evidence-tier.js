/* evidence-tier — EOS 用"证据阶梯"代替二元的 success/fail。
   拖动阶梯，看每一级能 claim 什么、不能 claim 什么。
   关键纪律：越往上要更多证据，且永远写明 claim boundary，绝不静默拔高。 */
(function () {
  window.EBWidgets["evidence-tier"] = function (root) {
    const c = (n) => EBW.c(n);
    const tiers = [
      { id: "blocked_with_evidence", zh: "受阻（带证据）", color: "ink-faint",
        can: ["列出已具备的 artifact", "明确列出 blockers（缺哪些能力）"],
        cant: ["不能 claim 任何 task 结果", "不能 claim 复现"],
        note: "诚实的『还差什么』本身就是一种合格产物——好过把缺口偷偷跳过。" },
      { id: "native_state_trace", zh: "原生状态轨迹", color: "rl",
        can: ["claim 后端原生状态被如实记录", "可供审计 / 调试"],
        cant: ["不能 claim 任务成功", "不能 claim 与某 evaluator 兼容"],
        note: "拿到了真实运行的状态流，但还没接到评分逻辑。" },
      { id: "evaluator_compatible", zh: "评测器兼容", color: "g103",
        can: ["claim 通过了某个 evaluator 的子集", "产出 MetricResult"],
        cant: ["不能 claim 复现了整个 benchmark", "不能 claim 跨后端等价"],
        note: "trace 已能喂进 Evaluator 打分，但只是该 benchmark 的一个子集。" },
      { id: "native_parity_matched", zh: "原生状态对齐", color: "interactive",
        can: ["claim 状态迁移在容差内对齐（state transfer matched）"],
        cant: ["仍不 claim 任务成功", "不 claim 后端等价 / 忠实复现 / 真实世界结论"],
        note: "即便最高一级，claim boundary 依然把话说死：对齐 ≠ 等价 ≠ 真实安全。" },
    ];
    let idx = 0;

    const ladder = EBW.el("div", { style: "display:flex;flex-direction:column-reverse;gap:6px;margin-bottom:12px" });
    const steps = tiers.map((t, i) => {
      const b = EBW.el("button", { style: "text-align:left;border:1px solid var(--border-strong);border-radius:8px;padding:8px 12px;cursor:pointer;background:var(--surface);color:var(--ink);font-family:var(--sans)" });
      b.innerHTML = `<span style="font-family:var(--mono);font-size:.72rem;color:var(--ink-faint)">tier ${i}</span> &nbsp;<b>${t.id}</b> <span style="color:var(--ink-faint)">· ${t.zh}</span>`;
      b.addEventListener("click", () => { idx = i; render(); });
      ladder.appendChild(b); return b;
    });
    const panel = EBW.el("div", { style: "background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:14px 16px" });

    function render() {
      steps.forEach((b, i) => {
        const on = i <= idx;
        b.style.borderColor = i === idx ? c(tiers[i].color) : c("border-strong");
        b.style.background = on ? c(tiers[i].color) + (i === idx ? "26" : "12") : c("surface");
        b.style.opacity = on ? "1" : ".55";
      });
      const t = tiers[idx];
      panel.innerHTML =
        `<div style="font-family:var(--mono);font-size:.72rem;color:${c(t.color)};margin-bottom:6px">EVIDENCE TIER ${idx} · ${t.zh}</div>` +
        `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">` +
        `<div><div style="font-size:.78rem;color:var(--interactive);margin-bottom:4px">✓ 可以 claim</div>${t.can.map((x) => `<div style="font-size:.84rem;color:var(--ink-soft);margin-bottom:3px">· ${x}</div>`).join("")}</div>` +
        `<div><div style="font-size:.78rem;color:var(--warn);margin-bottom:4px">✗ 不能 claim</div>${t.cant.map((x) => `<div style="font-size:.84rem;color:var(--ink-soft);margin-bottom:3px">· ${x}</div>`).join("")}</div>` +
        `</div><div style="margin-top:10px;font-size:.84rem;color:var(--ink-faint);line-height:1.6">${t.note}</div>`;
    }
    root.appendChild(ladder); root.appendChild(panel); render();
  };
})();
