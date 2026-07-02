/* data-loss-map — 数据源 → 表示 → loss → 更新模块的通路图。
   点左侧数据源，高亮它走的整条通路；没有动作标签的数据不点亮 action expert。 */
(function () {
  window.EBWidgets["data-loss-map"] = function (root) {
    const c = (n) => EBW.c(n);
    /* 列定义 */
    const sources = [
      { id: "vqa", label: "VQA / 语义理解", eg: "Robointer-VQA、web VQA", repr: "text", loss: "ce", mod: "backbone",
        note: "image + question → answer。只有文本标签、没有动作标签——只训练「看懂」，不碰 action expert。" },
      { id: "subtask", label: "高层子任务文本", eg: "π0.5 high-level subtask 数据", repr: "text", loss: "ce", mod: "backbone",
        note: "observation + task → 下一个 subtask 文本。教模型先想「做什么」。" },
      { id: "web", label: "web 图文", eg: "captioning / detection", repr: "text", loss: "ce", mod: "backbone",
        note: "世界知识与语言泛化的来源——也是 knowledge insulation 要保护的东西。" },
      { id: "real", label: "真实机器人轨迹", eg: "DROID、AgiBot、OXE-AugE", repr: "both", loss: "both", mod: "both",
        note: "有动作标签：预训练走 FAST 离散 token + CE（更新 backbone）；后训练走连续 chunk + flow（更新 expert）。" },
      { id: "sim", label: "仿真成功 rollout", eg: "LabEmbodied-Data（RoboGenesis 产）", repr: "both", loss: "both", mod: "both",
        note: "同样有动作标签，且带 subtask / object-state 标注。领域知识（实验室仪器、protocol）从这里进来。" },
    ];
    const reprs = [
      { id: "text", label: "text / FAST token", zh: "离散表示" },
      { id: "cont", label: "continuous action", zh: "连续表示" },
    ];
    const losses = [
      { id: "ce", label: "cross-entropy", zh: "next-token" },
      { id: "flow", label: "flow matching", zh: "MSE 回归速度场" },
    ];
    const mods = [
      { id: "backbone", label: "VLM backbone", zh: "大脑" },
      { id: "expert", label: "action expert / DiT", zh: "小脑" },
    ];

    let sel = 3; // 默认选真实机器人轨迹（通路最全）

    const W = 720, H = 300, COLX = [10, 260, 420, 575], BW = [230, 140, 135, 135], RH = 44, GAP = 12;
    const svg = EBW.svg("svg", { viewBox: `0 0 ${W} ${H}`, style: "width:100%;height:auto;display:block" });
    const note = EBW.el("div", { style: "margin-top:8px;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:10px 14px;font-size:.84rem;line-height:1.55;color:var(--ink-soft)" });

    /* 每个数据源激活的通路 */
    function paths(s) {
      const P = [];
      if (s.repr === "text" || s.repr === "both") P.push({ repr: "text", loss: "ce", mod: "backbone" });
      if (s.repr === "both") P.push({ repr: "cont", loss: "flow", mod: "expert" });
      return P;
    }

    function boxY(col, idx, total) {
      const totalH = total * RH + (total - 1) * GAP;
      const y0 = (H - totalH) / 2;
      return y0 + idx * (RH + GAP);
    }

    function render() {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      const S = sources[sel];
      const act = paths(S);
      const activeRepr = new Set(act.map((p) => p.repr));
      const activeLoss = new Set(act.map((p) => p.loss));
      const activeMod = new Set(act.map((p) => p.mod));

      /* 连线（画在盒子底下）*/
      const lines = [];
      sources.forEach((s, i) => {
        paths(s).forEach((p) => {
          const on = i === sel;
          lines.push({ x1: COLX[0] + BW[0], y1: boxY(0, i, sources.length) + RH / 2, x2: COLX[1], y2: boxY(1, p.repr === "text" ? 0 : 1, 2) + RH / 2, on, col: p.loss === "ce" ? "rl" : "interactive" });
          if (on) {
            lines.push({ x1: COLX[1] + BW[1], y1: boxY(1, p.repr === "text" ? 0 : 1, 2) + RH / 2, x2: COLX[2], y2: boxY(2, p.loss === "ce" ? 0 : 1, 2) + RH / 2, on, col: p.loss === "ce" ? "rl" : "interactive" });
            lines.push({ x1: COLX[2] + BW[2], y1: boxY(2, p.loss === "ce" ? 0 : 1, 2) + RH / 2, x2: COLX[3], y2: boxY(3, p.mod === "backbone" ? 0 : 1, 2) + RH / 2, on, col: p.loss === "ce" ? "rl" : "interactive" });
          }
        });
      });
      lines.forEach((l) => {
        const mx = (l.x1 + l.x2) / 2;
        svg.appendChild(EBW.svg("path", {
          d: `M ${l.x1} ${l.y1} C ${mx} ${l.y1}, ${mx} ${l.y2}, ${l.x2} ${l.y2}`,
          fill: "none", stroke: l.on ? c(l.col) : c("border"), "stroke-width": l.on ? 2.4 : 1, opacity: l.on ? 0.95 : 0.55,
        }));
      });

      /* 列标题 */
      const heads = ["数据源（点我）", "表示层", "loss", "更新谁"];
      heads.forEach((h, i) => {
        const t = EBW.svg("text", { x: COLX[i] + BW[i] / 2, y: 14, "text-anchor": "middle", "font-size": "10.5", "font-family": "var(--mono)", fill: c("ink-faint") });
        t.textContent = h; svg.appendChild(t);
      });

      /* 第 0 列：数据源 */
      sources.forEach((s, i) => {
        const y = boxY(0, i, sources.length);
        const on = i === sel;
        const g = EBW.svg("g", { style: "cursor:pointer" });
        g.appendChild(EBW.svg("rect", { x: COLX[0], y, width: BW[0], height: RH, rx: 8, fill: on ? c("accent") + "1a" : c("surface"), stroke: on ? c("accent") : c("border-strong"), "stroke-width": on ? 1.8 : 1 }));
        const t1 = EBW.svg("text", { x: COLX[0] + 10, y: y + 18, "font-size": "12", "font-weight": "600", fill: c("ink") });
        t1.textContent = s.label;
        const t2 = EBW.svg("text", { x: COLX[0] + 10, y: y + 34, "font-size": "10", "font-family": "var(--mono)", fill: c("ink-faint") });
        t2.textContent = s.eg;
        g.appendChild(t1); g.appendChild(t2);
        g.addEventListener("click", () => { sel = i; render(); });
        svg.appendChild(g);
      });

      /* 其余列 */
      function col(items, ci, activeSet, colorOf) {
        items.forEach((it, i) => {
          const y = boxY(ci, i, items.length);
          const on = activeSet.has(it.id);
          const color = colorOf(it);
          svg.appendChild(EBW.svg("rect", { x: COLX[ci], y, width: BW[ci], height: RH, rx: 8, fill: on ? c(color) + "22" : c("surface"), stroke: on ? c(color) : c("border"), "stroke-width": on ? 1.8 : 1, opacity: on ? 1 : 0.6 }));
          const t1 = EBW.svg("text", { x: COLX[ci] + BW[ci] / 2, y: y + 19, "text-anchor": "middle", "font-size": "11.5", "font-weight": "600", fill: on ? c(color) : c("ink-faint") });
          t1.textContent = it.label;
          const t2 = EBW.svg("text", { x: COLX[ci] + BW[ci] / 2, y: y + 34, "text-anchor": "middle", "font-size": "9.5", fill: c("ink-faint") });
          t2.textContent = it.zh;
          svg.appendChild(t1); svg.appendChild(t2);
        });
      }
      col(reprs, 1, new Set([...activeRepr].map((r) => (r === "cont" ? "cont" : "text"))), (it) => (it.id === "text" ? "rl" : "interactive"));
      col(losses, 2, activeLoss, (it) => (it.id === "ce" ? "rl" : "interactive"));
      col(mods, 3, activeMod, (it) => (it.id === "backbone" ? "rl" : "interactive"));

      note.innerHTML = `<b style="color:var(--ink)">${S.label}</b> — ${S.note}`;
    }

    root.appendChild(svg);
    root.appendChild(note);
    render();
  };
})();
