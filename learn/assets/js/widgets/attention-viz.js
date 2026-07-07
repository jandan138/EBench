/* attention-viz — 可交互 Attention 可视化（F-2 核心部件）
   6 个 token，点击一个作为 query，实时显示 attention 权重 + 加权 value */
(function () {
  window.EBWidgets["attention-viz"] = function (root) {
    const tokens = ["她", "在", "指", "小红", "的", "方向"];
    let queryIdx = 0;
    let maskMode = "full";
    let viewMode = "intuition";
    const toyQ = [[1, 2], [0.4, 0.1], [0.7, 1.3], [1.2, 1.9], [0.2, 0.1], [0.6, 0.5]];
    const toyK = [[2, 1], [0.2, 0.4], [1, 0], [3, 2], [0.1, 0.2], [0.5, 0.6]];
    const toyV = [[1, 0], [0.2, 0.2], [0, 1], [3, 1], [0.1, 0.1], [0.5, 1]];

    const wrap = EBW.el("div", { style: "font-size:.9rem" });
    const statusBar = EBW.el("div", {
      style: "margin-bottom:10px;padding:8px 12px;border-radius:8px;background:var(--accent-soft);border:1px solid var(--accent)"
    });
    const modeRow = EBW.el("div", { class: "ctrl-row", style: "margin-bottom:8px" });
    const modeCtrl = EBW.el("div", { class: "ctrl" });
    modeCtrl.appendChild(EBW.el("label", null, "<span>能看谁</span>"));
    modeCtrl.appendChild(EBW.seg(
      [{ label: "Full", value: "full" }, { label: "Causal", value: "causal" }],
      maskMode,
      (v) => { maskMode = v; render(); }
    ));
    modeRow.appendChild(modeCtrl);
    const viewCtrl = EBW.el("div", { class: "ctrl" });
    viewCtrl.appendChild(EBW.el("label", null, "<span>视图</span>"));
    viewCtrl.appendChild(EBW.seg(
      [{ label: "直觉", value: "intuition" }, { label: "手算", value: "calc" }],
      viewMode,
      (v) => { viewMode = v; render(); }
    ));
    modeRow.appendChild(viewCtrl);
    const hint = EBW.el("div", { style: "font-size:.78rem;color:var(--ink-faint);margin-bottom:6px" }, "点击下方词切换 Query（提问者）");
    const tokenRow = EBW.el("div", { style: "display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px" });
    const matrixWrap = EBW.el("div", { style: "margin:10px 0" });
    const outWrap = EBW.el("div", { style: "margin-top:10px" });

    const buttons = tokens.map((tok, i) => {
      const b = EBW.el("button", {
        type: "button",
        "data-idx": String(i),
        style: "padding:4px 10px;border-radius:6px;border:1px solid var(--border-strong);background:var(--surface);font-family:var(--sans);cursor:pointer;transition:border-color .15s,background .15s"
      }, tok);
      b.addEventListener("click", () => { queryIdx = i; render(); });
      tokenRow.appendChild(b);
      return b;
    });

    function attentionScores(q) {
      const n = tokens.length;
      return Array(n).fill(0).map((_, j) => {
        if (maskMode === "causal" && j > q) return -99;
        if (q === 0 && j === 3) return 2.8; // 她 -> 小红
        if (q === 2 && j === 3) return 2.2; // 指 -> 小红
        if (q === 3) return (j === 0 || j === 5) ? 1.8 : 0.6; // 小红 -> 她/方向
        return Math.max(0.2, 1.5 - Math.abs(q - j) * 0.4);
      });
    }

    function softmax(scores) {
      const max = Math.max(...scores);
      const exps = scores.map(s => Math.exp(s - max));
      const sum = exps.reduce((a, b) => a + b, 0);
      return exps.map(e => e / sum);
    }

    function dot(a, b) { return a.reduce((sum, x, i) => sum + x * b[i], 0); }

    function calcScores(q) {
      const raw = toyK.map(k => dot(toyQ[q], k));
      const scale = Math.sqrt(toyQ[q].length);
      return raw.map((s, j) => (maskMode === "causal" && j > q) ? -99 : s / scale);
    }

    function renderCalc(qTok, scores, weights) {
      const raw = toyK.map(k => dot(toyQ[queryIdx], k));
      const scale = Math.sqrt(toyQ[queryIdx].length);
      const z = [0, 1].map(dim => weights.reduce((sum, w, j) => sum + w * toyV[j][dim], 0));
      const rows = tokens.map((tok, j) => {
        const blocked = maskMode === "causal" && j > queryIdx;
        return `<tr>
          <td>${tok}</td>
          <td>[${toyK[j].map(v => v.toFixed(1)).join(", ")}]</td>
          <td>[${toyV[j].map(v => v.toFixed(1)).join(", ")}]</td>
          <td>${raw[j].toFixed(2)}</td>
          <td>${blocked ? "mask" : (raw[j] / scale).toFixed(2)}</td>
          <td>${blocked ? "0.000" : weights[j].toFixed(3)}</td>
        </tr>`;
      }).join("");
      return `
        <div style="margin-top:10px;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2)">
          <div style="font-size:.8rem;color:var(--ink-soft);margin-bottom:6px">手算模式：以「${qTok}」为 Query，q = [${toyQ[queryIdx].map(v => v.toFixed(1)).join(", ")}]，d_k = ${toyQ[queryIdx].length}</div>
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:.78rem">
              <thead><tr><th>Key位置</th><th>k_j</th><th>v_j</th><th>q·k</th><th>/sqrt(d_k)</th><th>softmax</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          <div style="font-family:var(--mono);font-size:.78rem;margin-top:8px;color:var(--ink-soft)">new vector z_${qTok} = Σ weight_j · v_j ≈ [${z.map(v => v.toFixed(3)).join(", ")}]</div>
        </div>`;
    }

    function render() {
      const qTok = tokens[queryIdx];
      statusBar.innerHTML =
        `<div style="font-size:.78rem;color:var(--ink-soft);margin-bottom:2px">当前 Query（提问者）</div>` +
        `<div style="font-size:1.15rem;font-weight:600;color:var(--accent)">「${qTok}」</div>` +
        `<div style="font-size:.76rem;color:var(--ink-faint);margin-top:4px">它在问：「${qTok}」和句子里哪些词最相关？${maskMode === "causal" ? " Causal 模式下不能看右侧未来词。" : " Full 模式下整句都能看。"}</div>`;

      buttons.forEach((b, i) => {
        const on = i === queryIdx;
        b.style.borderColor = on ? "var(--accent)" : "var(--border-strong)";
        b.style.background = on ? "var(--accent-soft)" : "var(--surface)";
        b.style.fontWeight = on ? "600" : "400";
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });

      const scores = viewMode === "calc" ? calcScores(queryIdx) : attentionScores(queryIdx);
      const weights = softmax(scores);

      // 单行权重条：当前 Query 对所有 Key 的关注度
      matrixWrap.innerHTML = "";
      matrixWrap.appendChild(EBW.el("div", {
        style: "font-family:var(--mono);font-size:.72rem;margin-bottom:6px;color:var(--ink-soft)"
      }, `「${qTok}」对各词的关注权重（softmax 后，合计 = 1）`));

      const barWrap = EBW.el("div", { style: "display:flex;gap:4px;align-items:flex-end;height:72px;margin-bottom:6px" });
      weights.forEach((w, j) => {
        const blocked = maskMode === "causal" && j > queryIdx;
        const col = EBW.el("div", { style: "flex:1;display:flex;flex-direction:column;align-items:center;gap:4px" });
        const h = Math.max(6, w * 56);
        col.appendChild(EBW.el("div", {
          style: `width:100%;height:${h}px;border-radius:4px 4px 0 0;background:${blocked ? "var(--border)" : (j === queryIdx ? "var(--border-strong)" : "var(--interactive)")};opacity:${blocked ? 0.28 : (j === queryIdx ? 0.35 : 0.55 + w * 0.45)}`
        }));
        col.appendChild(EBW.el("div", { style: "font-family:var(--mono);font-size:.7rem;color:var(--ink-faint)" }, blocked ? "mask" : w.toFixed(2)));
        col.appendChild(EBW.el("div", { style: "font-size:.78rem;color:var(--ink-soft)" }, tokens[j]));
        barWrap.appendChild(col);
      });
      matrixWrap.appendChild(barWrap);

      const topJ = weights.indexOf(Math.max(...weights));
      const topNote = topJ === queryIdx
        ? `（自关注：这个词也在看自己）`
        : `最关注「${tokens[topJ]}」（权重 ${weights[topJ].toFixed(2)}）`;
      matrixWrap.appendChild(EBW.el("div", {
        style: "font-size:.78rem;color:var(--ink-faint)"
      }, topNote));

      const weighted = weights
        .map((w, j) => (w < 0.04 ? null : `${tokens[j]}×${w.toFixed(2)}`))
        .filter(Boolean)
        .join(" + ");
      outWrap.innerHTML =
        `<div style="font-size:.8rem;color:var(--ink-soft)">按权重混合各词的 Value（内容）≈</div>` +
        `<div style="font-family:var(--mono);background:var(--surface-2);padding:6px 10px;border-radius:6px;margin-top:4px">${weighted}</div>` +
        `<div style="margin-top:6px;font-size:.78rem;color:var(--ink-faint)">Query 提问 → Key 匹配 → softmax 权重 → 按权重取 Value。mask 会在 softmax 前屏蔽不允许看的位置。</div>` +
        (viewMode === "calc" ? renderCalc(qTok, scores, weights) : "");
    }

    wrap.appendChild(statusBar);
    wrap.appendChild(modeRow);
    wrap.appendChild(hint);
    wrap.appendChild(tokenRow);
    wrap.appendChild(matrixWrap);
    wrap.appendChild(outWrap);
    root.appendChild(wrap);
    render();
  };
})();
