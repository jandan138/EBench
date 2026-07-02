/* ki-gradient — knowledge insulation 的计算图。
   前向恒在（灰实线）；切换 KI 开/关，看三种 loss 的反向梯度各自流到哪、
   flow 梯度是否被 stop-gradient 挡在 backbone 门外。 */
(function () {
  window.EBWidgets["ki-gradient"] = function (root) {
    const c = (n) => EBW.c(n);
    let ki = true;      // knowledge insulation 开关
    let anim = 0;       // 虚线滚动动画
    let raf = null;

    /* 布局：上排前向节点，下排 loss */
    const W = 720, H = 330;
    const N = {
      inp:   { x: 12,  y: 60,  w: 128, h: 56, l1: "image / text", l2: "state" },
      vlm:   { x: 190, y: 60,  w: 150, h: 56, l1: "VLM backbone", l2: "大脑（预训练知识）" },
      hid:   { x: 390, y: 60,  w: 118, h: 56, l1: "hidden prefix", l2: "前向可读" },
      exp:   { x: 558, y: 60,  w: 150, h: 56, l1: "action expert", l2: "DiT / 小脑" },
      ce:    { x: 190, y: 235, w: 150, h: 52, l1: "CE loss", l2: "VQA / language" },
      fast:  { x: 390, y: 235, w: 118, h: 52, l1: "FAST CE loss", l2: "离散 action token" },
      flow:  { x: 558, y: 235, w: 150, h: 52, l1: "flow matching loss", l2: "连续 chunk" },
    };

    const svg = EBW.svg("svg", { viewBox: `0 0 ${W} ${H}`, style: "width:100%;height:auto;display:block" });
    const ctrl = EBW.el("div", { class: "ctrl-row" });
    ctrl.appendChild(EBW.seg(
      [{ label: "KI 开（stop-gradient）", value: "on" }, { label: "KI 关（梯度全回流）", value: "off" }],
      "on", (v) => { ki = v === "on"; render(); }
    ));
    const legend = EBW.el("div", { style: "font-size:.76rem;color:var(--ink-faint);margin:0 0 6px" },
      `<span style="color:var(--ink-soft)">图例：</span>` +
      `<span style="border-bottom:2px solid ${c("border-strong")};padding-bottom:1px">前向</span>　` +
      `<span style="border-bottom:2px dashed ${c("rl")};padding-bottom:1px;color:${c("rl")}">CE 类梯度</span>　` +
      `<span style="border-bottom:2px dashed ${c("interactive")};padding-bottom:1px;color:${c("interactive")}">flow 梯度</span>　` +
      `<span style="color:${c("warn")}">⛔ stop-gradient</span>`);
    const verdict = EBW.el("div", { style: "margin-top:8px;border-radius:10px;padding:11px 14px;font-size:.85rem;line-height:1.55" });

    function box(n, hl) {
      const g = EBW.svg("g", {});
      g.appendChild(EBW.svg("rect", { x: n.x, y: n.y, width: n.w, height: n.h, rx: 9, fill: hl ? hl + "1c" : c("surface"), stroke: hl || c("border-strong"), "stroke-width": hl ? 2 : 1.2 }));
      const t1 = EBW.svg("text", { x: n.x + n.w / 2, y: n.y + 23, "text-anchor": "middle", "font-size": "12.5", "font-weight": "650", fill: c("ink") });
      t1.textContent = n.l1;
      const t2 = EBW.svg("text", { x: n.x + n.w / 2, y: n.y + 40, "text-anchor": "middle", "font-size": "9.5", fill: c("ink-faint") });
      t2.textContent = n.l2;
      g.appendChild(t1); g.appendChild(t2);
      return g;
    }
    const mid = (n) => ({ x: n.x + n.w / 2, y: n.y + n.h / 2 });
    const R = (n) => ({ x: n.x + n.w, y: n.y + n.h / 2 });
    const L = (n) => ({ x: n.x, y: n.y + n.h / 2 });
    const B = (n, f) => ({ x: n.x + n.w * (f == null ? 0.5 : f), y: n.y + n.h });
    const T = (n, f) => ({ x: n.x + n.w * (f == null ? 0.5 : f), y: n.y });

    function arrow(p1, p2, opt) {
      const o = opt || {};
      const dx = (p2.x - p1.x) * 0.4;
      const dy = (p2.y - p1.y) * 0.4;
      const d = o.curve === "v"
        ? `M ${p1.x} ${p1.y} C ${p1.x} ${p1.y + dy}, ${p2.x} ${p2.y - dy}, ${p2.x} ${p2.y}`
        : `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`;
      const path = EBW.svg("path", {
        d, fill: "none", stroke: o.color || c("border-strong"),
        "stroke-width": o.w || 1.6,
        "stroke-dasharray": o.dash ? "6 5" : "none",
        "stroke-dashoffset": o.dash && !EBW.reduced ? String(-anim) : "0",
        "marker-end": `url(#${o.marker || "m-fwd"})`, opacity: o.op == null ? 1 : o.op,
      });
      svg.appendChild(path);
      return path;
    }

    function render() {
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      /* markers */
      const defs = EBW.svg("defs", {});
      [["m-fwd", c("border-strong")], ["m-rl", c("rl")], ["m-int", c("interactive")]].forEach(([id, col]) => {
        const m = EBW.svg("marker", { id, viewBox: "0 0 10 10", refX: "9", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" });
        m.appendChild(EBW.svg("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: col }));
        defs.appendChild(m);
      });
      svg.appendChild(defs);

      /* ---- 前向（恒在，灰） ---- */
      arrow(R(N.inp), L(N.vlm));
      arrow(R(N.vlm), L(N.hid));
      arrow(R(N.hid), L(N.exp));
      const fwdLab = EBW.svg("text", { x: mid(N.hid).x, y: 40, "text-anchor": "middle", "font-size": "10", "font-family": "var(--mono)", fill: c("ink-faint") });
      fwdLab.textContent = "forward：expert 读得到 hidden states（KI 开关都一样）";
      svg.appendChild(fwdLab);

      /* 前向到 loss 的细线 */
      arrow(B(N.vlm, 0.35), T(N.ce, 0.5), { curve: "v", op: 0.45, w: 1.1 });
      arrow(B(N.vlm, 0.8), T(N.fast, 0.3), { curve: "v", op: 0.45, w: 1.1 });
      arrow(B(N.exp), T(N.flow), { curve: "v", op: 0.45, w: 1.1 });

      /* ---- 反向：CE / FAST → backbone（恒在） ---- */
      arrow(T(N.ce, 0.35), B(N.vlm, 0.2), { curve: "v", color: c("rl"), dash: true, w: 2.2, marker: "m-rl" });
      arrow(T(N.fast, 0.7), B(N.vlm, 0.65), { curve: "v", color: c("rl"), dash: true, w: 2.2, marker: "m-rl" });

      /* ---- 反向：flow → expert（恒在） ---- */
      arrow(T(N.flow, 0.75), B(N.exp, 0.75), { curve: "v", color: c("interactive"), dash: true, w: 2.2, marker: "m-int" });

      /* ---- 反向：flow → backbone —— 取决于 KI ---- */
      const gateX = (N.hid.x + N.hid.w / 2), gateY = 160;
      if (ki) {
        // 画一条试图回流但被挡住的线：flow loss → ⛔
        arrow({ x: N.flow.x + N.flow.w * 0.25, y: N.flow.y }, { x: gateX + 26, y: gateY + 12 }, { curve: "v", color: c("interactive"), dash: true, w: 2, op: 0.8, marker: "m-int" });
        const gate = EBW.svg("g", {});
        gate.appendChild(EBW.svg("circle", { cx: gateX, cy: gateY, r: 15, fill: c("warn") + "22", stroke: c("warn"), "stroke-width": 2 }));
        const gt = EBW.svg("text", { x: gateX, y: gateY + 5, "text-anchor": "middle", "font-size": "13" });
        gt.textContent = "⛔";
        gate.appendChild(gt);
        const gl = EBW.svg("text", { x: gateX, y: gateY + 32, "text-anchor": "middle", "font-size": "9.5", "font-family": "var(--mono)", fill: c("warn") });
        gl.textContent = "stop-gradient";
        gate.appendChild(gl);
        svg.appendChild(gate);
      } else {
        // flow 梯度一路杀回 backbone
        arrow({ x: N.flow.x + N.flow.w * 0.25, y: N.flow.y }, B(N.vlm, 0.92), { curve: "v", color: c("interactive"), dash: true, w: 2.6, marker: "m-int" });
        const warnT = EBW.svg("text", { x: gateX, y: gateY + 4, "text-anchor": "middle", "font-size": "10", "font-family": "var(--mono)", fill: c("interactive") });
        warnT.textContent = "flow 梯度直通 backbone";
        svg.appendChild(warnT);
      }

      /* ---- 节点（画在最上层） ---- */
      svg.appendChild(box(N.inp));
      svg.appendChild(box(N.vlm, ki ? c("rl") : c("warn")));
      svg.appendChild(box(N.hid));
      svg.appendChild(box(N.exp, c("interactive")));
      svg.appendChild(box(N.ce, c("rl")));
      svg.appendChild(box(N.fast, c("rl")));
      svg.appendChild(box(N.flow, c("interactive")));

      /* ---- 结论条 ---- */
      if (ki) {
        verdict.style.background = c("rl") + "14";
        verdict.style.border = `1px solid ${c("rl")}`;
        verdict.innerHTML = `<b style="color:${c("rl")}">KI 开：</b>backbone 只被 <b>CE / FAST</b> 这类干净稳定的离散监督更新（<b>不是被冻结</b>）；随机初始化 expert 的 flow 梯度被 stop-gradient 挡在门外——web 知识保住，训练更快。`;
      } else {
        verdict.style.background = c("warn") + "14";
        verdict.style.border = `1px solid ${c("warn")}`;
        verdict.innerHTML = `<b style="color:${c("warn")}">KI 关：</b>flow matching 的梯度（早期大而乱，因为 expert 随机初始化）直接回传 backbone——为了拟合动作把语义空间拉歪，这就是「后训练污染」：知识迁移变差、训练变慢。`;
      }
    }

    function tick() {
      anim = (anim + 0.35) % 22;
      render();
      raf = requestAnimationFrame(tick);
    }

    root.appendChild(ctrl);
    root.appendChild(legend);
    root.appendChild(svg);
    root.appendChild(verdict);
    if (EBW.reduced) render(); else tick();

    /* 离开视口停动画，省电 */
    if ("IntersectionObserver" in window && !EBW.reduced) {
      new IntersectionObserver((es) => {
        es.forEach((e) => {
          if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = null; }
          else if (e.isIntersecting && !raf) tick();
        });
      }).observe(root);
    }
  };
})();
