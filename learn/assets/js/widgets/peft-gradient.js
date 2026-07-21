/* peft-gradient — 同一 backbone 上三种参数更新制度。
   切换 全量微调 / Adapter / LoRA：看哪些模块被更新（亮起）、
   哪些模块冻结（灰，前向照走、梯度照穿、只是不更新）。 */
(function () {
  window.EBWidgets["peft-gradient"] = function (root) {
    const c = (n) => EBW.c(n);

    const MODES = {
      "full": {
        label: "全量微调",
        trainable: ["backbone", "head"],
        bypass: null,
        verdict: "所有参数都被更新。最直接，但最贵，也最容易把预训练知识冲掉。",
      },
      "adapter": {
        label: "Adapter（冻结主干）",
        trainable: ["bypass", "head"],
        bypass: "Adapter",
        verdict: "backbone 冻结：前向照走、梯度照穿，但 optimizer 不更新它。只有 Adapter 小网络与任务头被更新。",
      },
      "lora": {
        label: "LoRA（冻结主干）",
        trainable: ["bypass", "head"],
        bypass: "LoRA",
        verdict: "同样冻结 backbone，但旁路不是插在 block 之间，而是并在线性层旁：学 ΔW=BA，前向时 (W+BA)x。",
      },
    };

    const W = 720, H = 330;
    const N = {
      inp:      { x: 14,  y: 60, w: 92,  h: 56, l1: "输入", l2: "tokens" },
      backbone: { x: 150, y: 60, w: 200, h: 56, l1: "backbone blocks", l2: "Embedding / Attn / MLP / LN" },
      bypass:   { x: 185, y: 190, w: 130, h: 52, l1: "", l2: "" },
      head:     { x: 420, y: 60, w: 130, h: 56, l1: "task head", l2: "LM / action head" },
      loss:     { x: 610, y: 60, w: 96,  h: 56, l1: "loss", l2: "CE / flow" },
    };

    const svg = EBW.svg("svg", { viewBox: `0 0 ${W} ${H}`, style: "width:100%;height:auto;display:block" });
    const ctrl = EBW.el("div", { class: "ctrl-row" });
    const legend = EBW.el("div", { style: "font-size:.76rem;color:var(--ink-faint);margin:0 0 6px" },
      `<span style="color:var(--ink-soft)">图例：</span>` +
      `<span style="border-bottom:2px solid ${c("border-strong")};padding-bottom:1px">前向</span>　` +
      `<span style="border-bottom:2px dashed ${c("rl")};padding-bottom:1px;color:${c("rl")}">梯度</span>　` +
      `<span style="color:${c("interactive")}">■ 被更新</span>　` +
      `<span style="color:${c("ink-faint")}">■ 冻结（不更新）</span>`);
    const verdict = EBW.el("div", { style: "margin-top:8px;border-radius:10px;padding:11px 14px;font-size:.85rem;line-height:1.55;background:var(--surface-2,rgba(127,127,127,.08))" });

    let mode = "full";
    let anim = 0;
    ctrl.appendChild(EBW.seg(
      Object.entries(MODES).map(([value, m]) => ({ label: m.label, value })),
      "full", (v) => { mode = v; render(); },
    ));

    /* 梯度虚线缓慢滚动；prefers-reduced-motion 时保持静止 */
    if (!EBW.reduced) {
      const tick = () => { anim = (anim + 0.35) % 11; svg.querySelectorAll("path[data-grad]").forEach((p) => p.setAttribute("stroke-dashoffset", String(-anim))); requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }

    const midR = (n) => ({ x: n.x + n.w, y: n.y + n.h / 2 });
    const midL = (n) => ({ x: n.x, y: n.y + n.h / 2 });

    function arrow(p1, p2, opt) {
      const o = opt || {};
      const d = o.straight
        ? `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`
        : `M ${p1.x} ${p1.y} C ${(p1.x + p2.x) / 2} ${p1.y}, ${(p1.x + p2.x) / 2} ${p2.y}, ${p2.x} ${p2.y}`;
      const path = EBW.svg("path", {
        d, fill: "none", stroke: o.color || c("border-strong"),
        "stroke-width": o.w || 1.6,
        "stroke-dasharray": o.dash ? "6 5" : "none",
        "marker-end": `url(#${o.marker || "pg-fwd"})`,
        opacity: o.op == null ? 1 : o.op,
      });
      if (o.dash) path.setAttribute("data-grad", "1");
      svg.appendChild(path);
    }

    function box(n, trainable, label1, label2) {
      const col = trainable ? c("interactive") : c("border-strong");
      const g = EBW.svg("g", {});
      g.appendChild(EBW.svg("rect", {
        x: n.x, y: n.y, width: n.w, height: n.h, rx: 9,
        fill: trainable ? col + "1c" : c("surface"),
        stroke: col, "stroke-width": trainable ? 2 : 1.2,
      }));
      const t1 = EBW.svg("text", { x: n.x + n.w / 2, y: n.y + 23, "text-anchor": "middle", "font-size": "12.5", "font-weight": "650", fill: trainable ? c("ink") : c("ink-faint") });
      t1.textContent = label1;
      const t2 = EBW.svg("text", { x: n.x + n.w / 2, y: n.y + 40, "text-anchor": "middle", "font-size": "9.5", fill: c("ink-faint") });
      t2.textContent = label2;
      g.appendChild(t1); g.appendChild(t2);
      svg.appendChild(g);
    }

    function render() {
      const m = MODES[mode];
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      const defs = EBW.svg("defs", {});
      [["pg-fwd", c("border-strong")], ["pg-grad", c("rl")]].forEach(([id, col]) => {
        const mk = EBW.svg("marker", { id, viewBox: "0 0 10 10", refX: "9", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" });
        mk.appendChild(EBW.svg("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: col }));
        defs.appendChild(mk);
      });
      svg.appendChild(defs);

      /* 前向 */
      arrow(midR(N.inp), midL(N.backbone));
      arrow(midR(N.backbone), midL(N.head));
      arrow(midR(N.head), midL(N.loss));

      /* 旁路（Adapter / LoRA） */
      if (m.bypass) {
        const bp = N.bypass;
        /* 从 backbone 下方引出、再回到主干 */
        arrow({ x: N.backbone.x + 45, y: N.backbone.y + N.backbone.h }, { x: bp.x + 30, y: bp.y }, { straight: true });
        arrow({ x: bp.x + bp.w - 30, y: bp.y }, { x: N.backbone.x + N.backbone.w - 45, y: N.backbone.y + N.backbone.h }, { straight: true });
        box(bp, true, m.bypass === "Adapter" ? "Adapter" : "LoRA ΔW=BA", m.bypass === "Adapter" ? "降维→激活→升维" : "低秩旁路，并在线性层旁");
      }

      /* 梯度（从 loss 回头） */
      const gy = N.loss.y + N.loss.h + 26;
      arrow({ x: N.loss.x + 10, y: N.loss.y + N.loss.h }, { x: N.head.x + N.head.w - 10, y: N.head.y + N.head.h }, { color: c("rl"), dash: true, marker: "pg-grad", straight: true });
      arrow({ x: N.head.x + 14, y: N.head.y + N.head.h }, { x: N.backbone.x + N.backbone.w - 14, y: N.backbone.y + N.backbone.h }, { color: c("rl"), dash: true, marker: "pg-grad", straight: true, op: 0.9 });
      if (m.bypass) {
        arrow({ x: N.backbone.x + 60, y: N.backbone.y + N.backbone.h }, { x: N.bypass.x + N.bypass.w / 2, y: N.bypass.y + N.bypass.h }, { color: c("rl"), dash: true, marker: "pg-grad", straight: true });
      } else {
        arrow({ x: N.backbone.x + 20, y: N.backbone.y + N.backbone.h }, { x: N.inp.x + N.inp.w, y: N.inp.y + N.inp.h + 6 }, { color: c("rl"), dash: true, marker: "pg-grad", straight: true, op: 0.9 });
      }
      const gl = EBW.svg("text", { x: 360, y: gy + 34, "text-anchor": "middle", "font-size": "10.5", fill: c("rl") });
      gl.textContent = m.bypass
        ? "梯度穿过 backbone（用于传播），只更新亮起的模块"
        : "梯度一路穿回输入侧，更新所有模块";
      svg.appendChild(gl);

      /* 模块：亮 = 被更新 */
      box(N.inp, false, "输入", "tokens");
      box(N.backbone, m.trainable.includes("backbone"), "backbone blocks", "Embedding / Attn / MLP / LN");
      box(N.head, m.trainable.includes("head"), "task head", "LM / action head");
      box(N.loss, false, "loss", "CE / flow");

      verdict.textContent = m.verdict;
    }

    root.appendChild(ctrl);
    root.appendChild(legend);
    root.appendChild(svg);
    root.appendChild(verdict);
    render();
  };
})();
