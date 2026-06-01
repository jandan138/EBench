/* action-chunking — receding horizon：预测 H 步、只执行前 exec 步、再 replan。
   展示 chunk 越长 → 决策点越少（compounding error 越小）但越不"反应"（reactivity 低）。 */
(function () {
  window.EBWidgets["action-chunking"] = function (root) {
    const W = 560, H = 280, PAD = 34;
    const c = (n) => EBW.c(n);
    let chunkH = 12, exec = 6, disturb = false;
    const T = 48;

    const cv = EBW.el("canvas", { width: W, height: H, style: "width:100%;max-width:" + W + "px;margin:auto;background:var(--surface-2);border-radius:10px" });
    const ctx = cv.getContext("2d");
    const X = (i) => PAD + (i / T) * (W - 2 * PAD);
    const Y = (v) => H - PAD - v * (H - 2 * PAD);

    // 目标轨迹（一条平滑曲线，归一化 0..1）
    function goal(i) { return 0.5 + 0.32 * Math.sin(i * 0.22) + 0.1 * Math.sin(i * 0.5); }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      // 网格 + 目标
      ctx.strokeStyle = c("border"); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PAD, Y(0)); ctx.lineTo(W - PAD, Y(0)); ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i <= T; i++) { const x = X(i), y = Y(goal(i)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.strokeStyle = c("border-strong"); ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);

      // 模拟执行
      const rnd = EBW.rng(42);
      let state = goal(0), i = 0, replans = 0;
      const execPts = [];
      while (i < T) {
        replans++;
        // 在 replan 点预测一个 chunk（开环、带累积漂移）
        const startState = state;
        const predErr = (rnd() - 0.5) * 0.10; // 每次推理的小误差
        // 画预测的 chunk（淡）
        ctx.beginPath();
        for (let k = 0; k <= chunkH && i + k <= T; k++) {
          const pv = EBW.clamp(goal(i + k) + predErr * (1 + k * 0.05), 0, 1);
          const x = X(i + k), y = Y(pv); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.strokeStyle = c("accent") + "66"; ctx.lineWidth = 1.4; ctx.stroke();
        // replan 标记
        ctx.beginPath(); ctx.arc(X(i), Y(startState), 3.5, 0, 7); ctx.fillStyle = c("g103"); ctx.fill();

        // 执行前 exec 步（实线）
        ctx.beginPath(); ctx.moveTo(X(i), Y(startState));
        for (let k = 1; k <= exec && i + k <= T; k++) {
          let pv = EBW.clamp(goal(i + k) + predErr * (1 + k * 0.05), 0, 1);
          if (disturb && i + k === 22) pv = EBW.clamp(pv + 0.28, 0, 1); // 扰动
          execPts.push({ i: i + k, v: pv });
          ctx.lineTo(X(i + k), Y(pv)); state = pv;
        }
        ctx.strokeStyle = c("interactive"); ctx.lineWidth = 2.4; ctx.stroke();
        i += exec;
      }
      // 误差读数
      let err = 0; execPts.forEach((p) => err += Math.abs(p.v - goal(p.i)));
      err = (err / Math.max(1, execPts.length) * 100).toFixed(1);
      ctx.fillStyle = c("ink-soft"); ctx.font = "12px monospace";
      ctx.fillText("决策点(replan) 次数 = " + replans + "    平均跟踪误差 ≈ " + err, PAD, 16);
      ctx.fillStyle = c("g103"); ctx.fillText("● replan", W - 150, 16);
      ctx.fillStyle = c("accent"); ctx.fillText("─ 预测 chunk", W - 150, 32);
      ctx.fillStyle = c("interactive"); ctx.fillText("─ 实际执行", W - 150, 48);
    }

    const ctrls = EBW.el("div", { class: "ctrl-row" });
    ctrls.appendChild(EBW.slider("预测长度 H (action_horizon)", 2, 24, 1, chunkH, (v) => { chunkH = v; draw(); }).wrap);
    ctrls.appendChild(EBW.slider("执行步数 / replan 间隔 (exec)", 1, 24, 1, exec, (v) => { exec = v; draw(); }).wrap);
    const dWrap = EBW.el("div", { class: "ctrl" }); dWrap.appendChild(EBW.el("label", null, "<span>外部扰动</span>"));
    const dSeg = EBW.seg([{ label: "无", value: "0" }, { label: "t=22 撞一下", value: "1" }], "0", (v) => { disturb = v === "1"; draw(); });
    dWrap.appendChild(dSeg); ctrls.appendChild(dWrap);

    root.appendChild(cv); root.appendChild(ctrls);
    draw(); window.addEventListener("resize", draw);
  };
})();
