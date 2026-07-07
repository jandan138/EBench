/* softmax-temperature — Softmax 温度调节器（F-6） */
(function () {
  window.EBWidgets["softmax-temperature"] = function (root) {
    let temp = 1.0;
    const logits = [2.1, 1.4, 0.8, 0.3, -0.5]; // 模拟 5 个词的 logit
    const labels = ["pick", "place", "push", "wait", "other"];

    const c = (n) => EBW.c(n);
    const wrap = EBW.el("div");
    const ctrl = EBW.el("div", { class: "ctrl-row" });
    const s = EBW.slider("温度 Temperature", 0.1, 3, 0.1, temp, (v) => { temp = v; render(); });
    ctrl.appendChild(s.wrap);

    const bars = EBW.el("div", { style: "margin:10px 0" });
    const note = EBW.el("div", { style: "font-size:.8rem;color:var(--ink-faint)" });

    function softmax(logs, t) {
      const scaled = logs.map(l => l / t);
      const m = Math.max(...scaled);
      const e = scaled.map(x => Math.exp(x - m));
      const sum = e.reduce((a,b)=>a+b,0);
      return e.map(x => x / sum);
    }

    function render() {
      const probs = softmax(logits, temp);
      bars.innerHTML = "";
      probs.forEach((p, i) => {
        const row = EBW.el("div", { style: "display:flex;align-items:center;gap:8px;margin:3px 0" });
        row.appendChild(EBW.el("span", { style: "width:48px;font-family:var(--mono);font-size:.8rem" }, labels[i]));
        const bar = EBW.el("div", { style: `height:14px;background:var(--interactive);width:${(p*100).toFixed(1)}%;border-radius:3px;min-width:2px` });
        row.appendChild(bar);
        row.appendChild(EBW.el("span", { style: "font-family:var(--mono);font-size:.78rem;color:var(--ink-soft)" }, p.toFixed(3)));
        bars.appendChild(row);
      });
      note.textContent = temp < 0.7 ? "温度低 → 更确定（尖锐）" : temp > 1.5 ? "温度高 → 更随机（平滑）" : "温度 ≈1 → 正常分布";
    }

    wrap.appendChild(ctrl);
    wrap.appendChild(bars);
    wrap.appendChild(note);
    root.appendChild(wrap);
    render();
  };
})();
