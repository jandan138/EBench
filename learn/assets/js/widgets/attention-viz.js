/* attention-viz — 可交互 Attention 可视化（F-2 核心部件）
   6 个 token，点击一个作为 query，实时显示 attention 权重 + 加权 value */
(function () {
  window.EBWidgets["attention-viz"] = function (root) {
    const tokens = ["她", "在", "指", "小红", "的", "方向"];
    let queryIdx = 0;

    const c = (n) => EBW.c(n);

    const wrap = EBW.el("div", { style: "font-size:.9rem" });
    const controls = EBW.el("div", { class: "ctrl-row", style: "margin-bottom:8px" });
    const label = EBW.el("div", { style: "margin-bottom:4px;color:var(--ink-soft)" }, "点击一个词作为 Query（提问者）");

    const tokenRow = EBW.el("div", { style: "display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px" });
    const matrixWrap = EBW.el("div", { style: "margin:10px 0" });
    const outWrap = EBW.el("div", { style: "margin-top:10px" });

    tokens.forEach((tok, i) => {
      const b = EBW.el("button", {
        style: `padding:4px 10px;border-radius:6px;border:1px solid var(--border-strong);background:var(--surface);font-family:var(--sans);cursor:pointer;${i===queryIdx?'border-color:var(--accent);background:var(--accent-soft)':''}`
      }, tok);
      b.addEventListener("click", () => { queryIdx = i; render(); });
      tokenRow.appendChild(b);
    });

    function render() {
      // 伪 attention scores（简单可重复的模式）
      const n = tokens.length;
      const scores = Array(n).fill(0).map((_, j) => {
        // 模拟：query 更关注语义相关的词
        if (queryIdx === 0 && j === 3) return 2.8; // 她 -> 小红
        if (queryIdx === 2 && j === 3) return 2.2;
        if (queryIdx === 3) return (j === 0 || j === 5) ? 1.8 : 0.6;
        return Math.max(0.2, 1.5 - Math.abs(queryIdx - j) * 0.4);
      });

      // softmax
      const max = Math.max(...scores);
      const exps = scores.map(s => Math.exp(s - max));
      const sum = exps.reduce((a,b)=>a+b,0);
      const weights = exps.map(e => e / sum);

      // 画矩阵
      matrixWrap.innerHTML = `<div style="font-family:var(--mono);font-size:.72rem;margin-bottom:4px">Attention 权重（softmax 后）</div>`;
      const table = document.createElement("div");
      table.style.display = "grid";
      table.style.gridTemplateColumns = `repeat(${n+1}, 1fr)`;
      table.style.gap = "2px";
      table.style.fontSize = ".78rem";

      // header
      table.appendChild(EBW.el("div"));
      tokens.forEach(t => table.appendChild(EBW.el("div", {style:"text-align:center;color:var(--ink-faint)"}, t)));

      tokens.forEach((tok, i) => {
        const rowLab = EBW.el("div", {style:"font-family:var(--mono);color:var(--ink-soft);padding-right:4px"}, tok);
        table.appendChild(rowLab);
        weights.forEach((w, j) => {
          const cell = EBW.el("div", {
            style: `text-align:center;padding:3px 4px;border-radius:3px;background:${i===queryIdx ? 'var(--accent-soft)' : 'var(--surface-2)'};color:${i===queryIdx ? 'var(--accent)' : 'var(--ink)'};font-family:var(--mono)`
          }, (i === queryIdx ? w.toFixed(2) : "—"));
          table.appendChild(cell);
        });
      });

      matrixWrap.innerHTML = "";
      matrixWrap.appendChild(EBW.el("div", {style:"font-family:var(--mono);font-size:.72rem;margin-bottom:4px"}, "Attention 权重（softmax 后）"));
      matrixWrap.appendChild(table);

      // 加权结果
      const weighted = weights.map((w, j) => `${tokens[j]}×${w.toFixed(2)}`).join(" + ");
      outWrap.innerHTML =
        `<div style="font-size:.8rem;color:var(--ink-soft)">Query = “${tokens[queryIdx]}” 的加权结果 ≈</div>` +
        `<div style="font-family:var(--mono);background:var(--surface-2);padding:6px 10px;border-radius:6px;margin-top:4px">${weighted}</div>` +
        `<div style="margin-top:6px;font-size:.78rem;color:var(--ink-faint)">模型根据当前词的“问题”（Query），从其他词的“标签”（Key）里找到最匹配的，把它们的“内容”（Value）按权重混合。</div>`;
    }

    controls.appendChild(label);
    controls.appendChild(tokenRow);
    wrap.appendChild(controls);
    wrap.appendChild(matrixWrap);
    wrap.appendChild(outWrap);
    root.appendChild(wrap);

    render();
  };
})();
