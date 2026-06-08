/* aggregation-pitfall — Simpson's paradox 在 benchmark 里的现身。
   模型 A 在「简单任务」和「困难任务」两个子群上都不弱，但若两个 benchmark
   的任务难度配比不同，"总平均"可能把排名整个翻过来。拖动看排名翻转。 */
(function () {
  window.EBWidgets["aggregation-pitfall"] = function (root) {
    const c = (n) => EBW.c(n);
    // 每个子群上的 per-task 平均分（A/B），以及该 benchmark 里两类任务的数量
    let aEasy = 0.90, aHard = 0.40, bEasy = 0.80, bHard = 0.55;
    let nEasy = 80, nHard = 20; // 任务配比（简单 : 困难）

    const W = 560, H = 220, PAD = 40;
    const cv = EBW.el("canvas", { width: W, height: H, style: "width:100%;max-width:" + W + "px;margin:auto;background:var(--surface-2);border-radius:10px" });
    const ctx = cv.getContext("2d");
    const note = EBW.el("div", { style: "margin-top:10px;font-size:.86rem;line-height:1.6" });

    function overall(easy, hard) { return (easy * nEasy + hard * nHard) / (nEasy + nHard); }

    function bar(x, w, val, color, label) {
      const y0 = H - PAD, h = val * (H - 2 * PAD);
      ctx.fillStyle = color; ctx.fillRect(x, y0 - h, w, h);
      ctx.fillStyle = c("ink"); ctx.font = "bold 12px monospace";
      ctx.fillText(val.toFixed(2), x + w / 2 - 13, y0 - h - 6);
      ctx.fillStyle = c("ink-soft"); ctx.font = "11px sans-serif";
      ctx.fillText(label, x + w / 2 - ctx.measureText(label).width / 2, y0 + 15);
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const oA = overall(aEasy, aHard), oB = overall(bEasy, bHard);
      // 三组：简单子群、困难子群、总平均
      const groups = [
        { t: "简单任务", a: aEasy, b: bEasy },
        { t: "困难任务", a: aHard, b: bHard },
        { t: "总平均", a: oA, b: oB },
      ];
      const gw = (W - 2 * PAD) / 3, bw = 26;
      groups.forEach((g, i) => {
        const cx = PAD + i * gw + gw / 2;
        if (i === 2) { ctx.strokeStyle = c("border-strong"); ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(PAD + i * gw - 6, PAD - 8); ctx.lineTo(PAD + i * gw - 6, H - PAD); ctx.stroke(); ctx.setLineDash([]); }
        bar(cx - bw - 3, bw, g.a, c("rl"), "");
        bar(cx + 3, bw, g.b, c("g103"), "");
        ctx.fillStyle = c("ink-soft"); ctx.font = "12px sans-serif";
        ctx.fillText(g.t, cx - ctx.measureText(g.t).width / 2, H - PAD + 30);
      });
      // 图例
      ctx.font = "11px sans-serif";
      ctx.fillStyle = c("rl"); ctx.fillText("■ 模型 A", PAD, 16);
      ctx.fillStyle = c("g103"); ctx.fillText("■ 模型 B", PAD + 70, 16);

      const subWinA = (aEasy > bEasy) && (aHard > bHard);
      const subWinB = (aEasy < bEasy) && (aHard < bHard);
      const ovWin = oA > oB ? "A" : (oB > oA ? "B" : "平手");
      let msg;
      if (subWinA && ovWin !== "A") msg = `⚠ <b style="color:var(--warn)">悖论出现</b>：A 在简单、困难子群上<b>都</b>赢，但<b>总平均却是 ${ovWin} 赢</b>（${oA.toFixed(3)} vs ${oB.toFixed(3)}）。任务配比（${nEasy}:${nHard}）放大了 A 不擅长的那一类。`;
      else if (subWinB && ovWin !== "B") msg = `⚠ <b style="color:var(--warn)">悖论出现</b>：B 在两个子群上都赢，总平均却被 ${ovWin} 反超。`;
      else msg = `当前：A 子群均分 (${aEasy.toFixed(2)},${aHard.toFixed(2)})，B (${bEasy.toFixed(2)},${bHard.toFixed(2)})；总平均 A=${oA.toFixed(3)}、B=${oB.toFixed(3)} → <b>${ovWin}</b> 领先。调难度配比看排名是否翻转。`;
      note.innerHTML = msg;
    }

    const ctrls = EBW.el("div", { class: "ctrl-row", style: "margin-top:8px" });
    ctrls.appendChild(EBW.slider("任务配比：简单数量", 0, 100, 1, nEasy, (v) => { nEasy = v; nHard = 100 - v; draw(); }).wrap);
    ctrls.appendChild(EBW.slider("A · 简单均分", 0, 1, 0.01, aEasy, (v) => { aEasy = v; draw(); }).wrap);
    ctrls.appendChild(EBW.slider("A · 困难均分", 0, 1, 0.01, aHard, (v) => { aHard = v; draw(); }).wrap);
    ctrls.appendChild(EBW.slider("B · 简单均分", 0, 1, 0.01, bEasy, (v) => { bEasy = v; draw(); }).wrap);
    ctrls.appendChild(EBW.slider("B · 困难均分", 0, 1, 0.01, bHard, (v) => { bHard = v; draw(); }).wrap);

    root.appendChild(cv); root.appendChild(ctrls); root.appendChild(note);
    draw(); window.addEventListener("resize", draw);
  };
})();
