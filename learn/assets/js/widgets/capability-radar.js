/* capability-radar — 把单一 success rate 摊开成多轴 capability profile。
   注：数值为示意（illustrative），用于说明"多轴诊断"思想，非真实 leaderboard。 */
(function () {
  window.EBWidgets["capability-radar"] = function (root) {
    const axes = ["Long-Horizon", "Pick-and-Place", "Dexterous", "Mobility", "Instruction", "OOD 泛化"];
    const series = [
      { name: "Model A", color: "accent", on: true, v: [0.42, 0.81, 0.55, 0.7, 0.6, 0.38] },
      { name: "Model B", color: "interactive", on: true, v: [0.7, 0.74, 0.4, 0.46, 0.72, 0.52] },
      { name: "Model C", color: "g103", on: false, v: [0.55, 0.6, 0.78, 0.5, 0.66, 0.6] },
    ];
    const S = 320, cx = S / 2, cy = S / 2, R = 120;
    const c = (n) => EBW.c(n);

    const wrap = EBW.el("div", { style: "display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:center" });
    const svg = EBW.svg("svg", { viewBox: `0 0 ${S} ${S}`, width: S, height: S, style: "max-width:100%" });
    wrap.appendChild(svg);

    function pt(i, r) {
      const a = -Math.PI / 2 + (i / axes.length) * Math.PI * 2;
      return [cx + Math.cos(a) * r * R, cy + Math.sin(a) * r * R];
    }
    function draw() {
      svg.innerHTML = "";
      // 网格圈
      [0.25, 0.5, 0.75, 1].forEach((g) => {
        const poly = EBW.svg("polygon", { fill: "none", stroke: c("border"), "stroke-width": 1 });
        poly.setAttribute("points", axes.map((_, i) => pt(i, g).join(",")).join(" "));
        svg.appendChild(poly);
      });
      // 轴线 + 标签
      axes.forEach((ax, i) => {
        const [x, y] = pt(i, 1);
        const ln = EBW.svg("line", { x1: cx, y1: cy, x2: x, y2: y, stroke: c("border"), "stroke-width": 1 });
        svg.appendChild(ln);
        const [lx, ly] = pt(i, 1.16);
        const t = EBW.svg("text", { x: lx, y: ly, "text-anchor": "middle", "dominant-baseline": "middle", "font-size": 10, fill: c("ink-soft") });
        t.textContent = ax; svg.appendChild(t);
      });
      // 各 series
      series.filter((s) => s.on).forEach((s) => {
        const poly = EBW.svg("polygon", { fill: c(s.color) + "22", stroke: c(s.color), "stroke-width": 2 });
        poly.setAttribute("points", s.v.map((val, i) => pt(i, val).join(",")).join(" "));
        svg.appendChild(poly);
        s.v.forEach((val, i) => { const [x, y] = pt(i, val); svg.appendChild(EBW.svg("circle", { cx: x, cy: y, r: 3, fill: c(s.color) })); });
      });
    }

    const legend = EBW.el("div", { style: "display:flex;flex-direction:column;gap:8px" });
    series.forEach((s) => {
      const lab = EBW.el("label", { style: "display:flex;align-items:center;gap:8px;cursor:pointer;font-size:.85rem" });
      const cb = EBW.el("input", { type: "checkbox" }); cb.checked = s.on;
      cb.addEventListener("change", () => { s.on = cb.checked; draw(); });
      lab.appendChild(cb);
      lab.appendChild(EBW.el("span", { style: `width:12px;height:12px;border-radius:3px;background:var(--${s.color})` }));
      lab.appendChild(EBW.el("span", null, s.name));
      legend.appendChild(lab);
    });
    legend.appendChild(EBW.el("div", { style: "font-size:.72rem;color:var(--ink-faint);max-width:160px;margin-top:6px" }, "数值为示意。真实诊断报告由 online challenge 在 Test-Mini 上自动生成。"));
    wrap.appendChild(legend);

    root.appendChild(wrap); draw();
  };
})();
