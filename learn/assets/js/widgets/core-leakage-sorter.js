/* core-leakage-sorter — EOS 的 core 边界铁律：core/ 必须 domain-agnostic。
   把每个概念归入 core / scenario-pack / adapter 三桶，点按钮在三桶间切换，
   全部归对才「通过 check_core_leakage」。 */
(function () {
  window.EBWidgets["core-leakage-sorter"] = function (root) {
    const c = (n) => EBW.c(n);
    const buckets = [
      { id: "core", label: "core/ (通用内核)", color: "interactive", hint: "domain-agnostic：不含任何 benchmark / 场景 / 仿真器专有名字" },
      { id: "scenario", label: "scenario_packs/", color: "g103", hint: "某一类场景的领域语义（实验室、家居、工厂…）" },
      { id: "adapter", label: "adapters/", color: "rl", hint: "把外部 benchmark / 仿真器接进来的防腐层" },
    ];
    // answer = 正确归属
    const items = [
      { t: "TaskSpec", a: "core" },
      { t: "MetricFamily", a: "core" },
      { t: "EpisodeTrace", a: "core" },
      { t: "BackendAdapter (ABC)", a: "core" },
      { t: "PipettePrimitive", a: "scenario" },
      { t: "liquid_volume_ul", a: "scenario" },
      { t: "Contamination 事件", a: "scenario" },
      { t: "EBench / Lift2 映射", a: "adapter" },
      { t: "GenManip runtime probe", a: "adapter" },
      { t: "Isaac41 / AutoBio 导入", a: "adapter" },
    ];
    // 初始全部放在一个"未分类"占位（用 -1），用户点击循环 core→scenario→adapter
    const order = ["core", "scenario", "adapter"];
    const state = items.map(() => -1);

    const grid = EBW.el("div", { style: "display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px" });
    const chips = items.map((it, i) => {
      const ch = EBW.el("button", { style: "border:1px dashed var(--border-strong);border-radius:999px;padding:6px 12px;cursor:pointer;background:var(--surface);color:var(--ink-soft);font-family:var(--mono);font-size:.8rem" });
      ch.addEventListener("click", () => { state[i] = (state[i] + 1) % 3; paint(i); score(); });
      grid.appendChild(ch); return ch;
    });
    const legend = EBW.el("div", { style: "display:flex;gap:14px;flex-wrap:wrap;margin-bottom:10px;font-size:.78rem" });
    buckets.forEach((b) => legend.appendChild(EBW.el("span", { style: `color:${c(b.color)}` }, `● <b style="color:var(--ink-soft)">${b.label}</b> — ${b.hint}`)));
    const result = EBW.el("div", { style: "font-size:.88rem;line-height:1.6;margin-top:6px" });

    function paint(i) {
      const ch = chips[i], s = state[i];
      if (s < 0) { ch.textContent = items[i].t; ch.style.borderStyle = "dashed"; ch.style.color = c("ink-soft"); ch.style.background = c("surface"); ch.style.borderColor = c("border-strong"); return; }
      const b = buckets[order.indexOf(order[s])];
      const col = c(buckets.find(x => x.id === order[s]).color);
      ch.textContent = items[i].t + " → " + order[s];
      ch.style.borderStyle = "solid"; ch.style.color = col; ch.style.borderColor = col; ch.style.background = col + "1a";
    }
    function score() {
      const placed = state.filter((s) => s >= 0).length;
      const correct = state.filter((s, i) => s >= 0 && order[s] === items[i].a).length;
      let msg;
      if (placed < items.length) msg = `已归类 ${placed}/${items.length}。点击 chip 在 core → scenario → adapter 间循环切换。`;
      else if (correct === items.length) msg = `✅ <b style="color:var(--interactive)">全部正确，通过 check_core_leakage</b>。core/ 里没有任何场景/benchmark 专有名字——这正是 EOS 的铁律。`;
      else msg = `❌ <b style="color:var(--warn)">${items.length - correct} 处会触发 core leakage 告警</b>。回忆规则：通用类型进 core；场景语义进 scenario_packs；外部 benchmark/仿真器进 adapters。`;
      result.innerHTML = msg;
    }

    root.appendChild(legend); root.appendChild(grid); root.appendChild(result);
    items.forEach((_, i) => paint(i)); score();
  };
})();
