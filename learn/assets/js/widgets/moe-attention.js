/* moe-attention — action expert：image/text token 走 VLM 权重，state/action token 走
   action-expert 权重；二者共享一次 attention。可视化 token 路由与 attention mask。 */
(function () {
  window.EBWidgets["moe-attention"] = function (root) {
    // token 序列
    const toks = [
      { t: "I", lab: "img", exp: "vlm" }, { t: "I", lab: "img", exp: "vlm" }, { t: "I", lab: "img", exp: "vlm" },
      { t: "T", lab: "txt", exp: "vlm" }, { t: "T", lab: "txt", exp: "vlm" },
      { t: "S", lab: "state", exp: "act" },
      { t: "A", lab: "a0", exp: "act" }, { t: "A", lab: "a1", exp: "act" }, { t: "A", lab: "a2", exp: "act" }, { t: "A", lab: "a3", exp: "act" },
    ];
    const n = toks.length, cell = 30, gap = 2, off = 70;
    const S = off + n * (cell + gap) + 10;
    const c = (k) => EBW.c(k);
    const expColor = (e) => e === "vlm" ? c("accent") : c("interactive");
    // mask: row i 是否 attend col j
    function attends(i, j) {
      const ri = toks[i], cj = toks[j];
      // prefix（img/text）：彼此 full attention，不看 action/state
      if (ri.exp === "vlm") return cj.exp === "vlm";
      // state/action：看 prefix + state/action（action 之间 bidirectional）
      return true;
    }
    let mode = "mask";

    const wrap = EBW.el("div");
    const svg = EBW.svg("svg", { viewBox: `0 0 ${S} ${S}`, width: S, height: S, style: "max-width:100%" });
    function draw() {
      svg.innerHTML = "";
      // 列标签（上）
      toks.forEach((tk, j) => {
        const x = off + j * (cell + gap);
        const t = EBW.svg("text", { x: x + cell / 2, y: off - 8, "text-anchor": "middle", "font-size": 9, fill: expColor(tk.exp) });
        t.textContent = tk.lab; svg.appendChild(t);
      });
      toks.forEach((ri, i) => {
        const y = off + i * (cell + gap);
        const tl = EBW.svg("text", { x: off - 8, y: y + cell / 2 + 3, "text-anchor": "end", "font-size": 9, fill: expColor(ri.exp) });
        tl.textContent = ri.lab; svg.appendChild(tl);
        toks.forEach((cj, j) => {
          const x = off + j * (cell + gap);
          const r = EBW.svg("rect", { x, y, width: cell, height: cell, rx: 4 });
          if (mode === "mask") {
            const ok = attends(i, j);
            r.setAttribute("fill", ok ? expColor(ri.exp) : c("surface-2"));
            r.setAttribute("opacity", ok ? .8 : 1);
            r.setAttribute("stroke", c("border")); r.setAttribute("stroke-width", ok ? 0 : 1);
          } else {
            // routing 视图：按 row token 所属 expert 上色（对角强调）
            r.setAttribute("fill", expColor(ri.exp)); r.setAttribute("opacity", i === j ? .9 : .25);
          }
          svg.appendChild(r);
        });
      });
    }

    const ctrls = EBW.el("div", { class: "ctrl-row", style: "margin-top:10px" });
    const mw = EBW.el("div", { class: "ctrl" }); mw.appendChild(EBW.el("label", null, "<span>视图</span>"));
    mw.appendChild(EBW.seg([{ label: "attention mask", value: "mask" }, { label: "expert 路由", value: "route" }], mode, (v) => { mode = v; draw(); }));
    ctrls.appendChild(mw);
    const legend = EBW.el("div", { style: "display:flex;gap:16px;align-items:center;font-size:.8rem" });
    legend.innerHTML = `<span style="display:inline-flex;align-items:center;gap:6px"><span style="width:12px;height:12px;border-radius:3px;background:var(--accent)"></span>VLM 权重 (PaliGemma)</span>
      <span style="display:inline-flex;align-items:center;gap:6px"><span style="width:12px;height:12px;border-radius:3px;background:var(--interactive)"></span>action expert 权重</span>`;
    ctrls.appendChild(legend);

    const cap = EBW.el("p", { style: "font-size:.82rem;color:var(--ink-soft);margin:10px 0 0" },
      "行 = query token，列 = key token。<b>mask 视图</b>：亮格表示「该 token 能看见」。img/text 只在前缀内部互看（prefix）；state/action 能看前缀也能看彼此（action 之间 full bidirectional）。<b>路由视图</b>：同一次 attention 里，两类 token 各自经过不同的 MLP/投影权重 —— 这就是 action expert（一个两元的 mixture-of-experts）。");

    wrap.appendChild(svg); wrap.appendChild(ctrls); wrap.appendChild(cap);
    root.appendChild(wrap); draw();
  };
})();
