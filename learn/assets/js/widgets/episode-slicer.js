/* episode-slicer — 一条成功 episode 怎么切成训练样本。
   拖动 t 选切片起点、调 H 看 chunk 覆盖范围；下方列出该切片对应的 (obs, target) 样本。 */
(function () {
  window.EBWidgets["episode-slicer"] = function (root) {
    const T = 24;              // 演示用的 episode 总步数（示意）
    let t = 4;                 // 当前切片起点
    let H = 8;                 // action horizon（示意值，可调）
    const c = (n) => EBW.c(n);

    /* ---- 控件行 ---- */
    const ctrls = EBW.el("div", { class: "ctrl-row" });
    const sT = EBW.slider("切片起点 t", 0, T - 1, 1, t, (v) => { t = v; render(); });
    const sH = EBW.slider("action horizon H", 2, 16, 1, H, (v) => { H = v; render(); });
    ctrls.appendChild(sT.wrap); ctrls.appendChild(sH.wrap);

    /* ---- 时间轴 SVG ---- */
    const W = 720, ROWH = 34, PAD = 14;
    const rows = [
      { key: "img", label: "video.*_view", color: "rl" },
      { key: "state", label: "state.joints/…", color: "g103" },
      { key: "act", label: "action", color: "interactive" },
    ];
    const svgH = PAD * 2 + ROWH * rows.length + 46;
    const svg = EBW.svg("svg", { viewBox: `0 0 ${W} ${svgH}`, style: "width:100%;height:auto;display:block" });

    const cellW = (W - 150 - PAD) / T;
    const x0 = 140;

    function render() {
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      /* 行标签 + 格子 */
      rows.forEach((r, ri) => {
        const y = PAD + ri * ROWH;
        const lab = EBW.svg("text", { x: x0 - 10, y: y + ROWH / 2 + 4, "text-anchor": "end", "font-size": "11", "font-family": "var(--mono)", fill: c("ink-soft") });
        lab.textContent = r.label;
        svg.appendChild(lab);
        for (let i = 0; i < T; i++) {
          const inObs = (r.key !== "act") && i === t;
          const inChunk = (r.key === "act") && i >= t && i < Math.min(t + H, T);
          const rect = EBW.svg("rect", {
            x: x0 + i * cellW + 1, y: y + 4, width: cellW - 2, height: ROWH - 10, rx: 3,
            fill: inObs ? c("rl") : inChunk ? c("interactive") : c("surface-2"),
            stroke: inObs || inChunk ? "none" : c("border"),
            "stroke-width": 1, opacity: inObs || inChunk ? 0.95 : 1, style: "cursor:pointer",
          });
          rect.addEventListener("click", () => { t = EBW.clamp(i, 0, T - 1); sT.setVal(t); render(); });
          svg.appendChild(rect);
        }
      });

      /* obs 括号标注 */
      const yObs = PAD - 3;
      const obsX = x0 + t * cellW + cellW / 2;
      const tagObs = EBW.svg("text", { x: obsX, y: yObs + 6, "text-anchor": "middle", "font-size": "10.5", "font-family": "var(--mono)", fill: c("rl"), "font-weight": "700" });
      tagObs.textContent = `obs_t (t=${t})`;
      svg.appendChild(tagObs);

      /* chunk 花括号标注 */
      const yAct = PAD + 2 * ROWH;
      const cx1 = x0 + t * cellW, cx2 = x0 + Math.min(t + H, T) * cellW;
      const brace = EBW.svg("path", {
        d: `M ${cx1} ${yAct + ROWH - 2} L ${cx1} ${yAct + ROWH + 6} L ${cx2} ${yAct + ROWH + 6} L ${cx2} ${yAct + ROWH - 2}`,
        fill: "none", stroke: c("interactive"), "stroke-width": 1.5,
      });
      svg.appendChild(brace);
      const tagChunk = EBW.svg("text", { x: (cx1 + cx2) / 2, y: yAct + ROWH + 20, "text-anchor": "middle", "font-size": "10.5", "font-family": "var(--mono)", fill: c("interactive"), "font-weight": "700" });
      tagChunk.textContent = t + H > T ? `action chunk a_${t}:${T - 1}（触到 episode 末尾）` : `action chunk a_${t}:${t + H - 1}（H=${H}）`;
      svg.appendChild(tagChunk);

      /* episode 末尾 success 旗 */
      const flag = EBW.svg("text", { x: x0 + T * cellW + 4, y: PAD + ROWH * 1.5, "font-size": "12" });
      flag.textContent = "✅";
      svg.appendChild(flag);

      /* 样本卡片 */
      const nSamples = T; // 每个 t 都能切一个样本
      card.innerHTML =
        `<div style="font-family:var(--mono);font-size:.72rem;color:var(--ink-faint);margin-bottom:6px">sample @ t=${t}</div>` +
        `<div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:.84rem;line-height:1.55">` +
        `<span style="font-family:var(--mono);color:var(--rl)">input</span><span>image_${t}（多相机帧）+ state_${t}（joints/gripper/base）+ instruction（整条 episode 共用）</span>` +
        `<span style="font-family:var(--mono);color:var(--interactive)">target</span><span>action_${t} … action_${Math.min(t + H, T) - 1}${t + H > T ? "（不足 H 步，pad / mask 掉尾部）" : ""}</span>` +
        `</div>` +
        `<div style="margin-top:8px;font-size:.8rem;color:var(--ink-faint)">这条长度 T=${T} 的 episode 一共能切出 <b style="color:var(--ink)">${nSamples}</b> 个训练样本——不是 1 个。监督信号是「此刻起往后 H 步专家怎么动」，不是「最终成功画面」。</div>`;
    }

    const card = EBW.el("div", { style: "margin-top:10px;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:12px 14px" });

    root.appendChild(ctrls);
    root.appendChild(svg);
    root.appendChild(card);
    render();
  };
})();
